#!/usr/bin/env bash
# Tests the self-hosted image's route rules against a fake Immich (ADR-0013): allowed reads
# arrive with the server's key and none of the browser's credentials, everything else answers
# 403 without reaching Immich, and invalid settings stop the start. With a data volume the
# library service answers /api/library and keeps what it stores across containers (ADR-0018).
#
#   deploy/test-image.sh            builds the image from this checkout, then tests it
#   deploy/test-image.sh <image>    tests an image that already exists
#
# Every wait is on a log line the awaited state writes, never on a timer; the timeout only
# bounds a hang.
set -euo pipefail
cd "$(dirname "$0")/.."

readonly IMAGE=${1:-glissando:test}
if [ $# -eq 0 ]; then
	docker build --quiet --tag "$IMAGE" --file deploy/Dockerfile . >/dev/null
fi
# The fake runs on the build's own Node image, so the test pulls nothing unpinned.
NODE_IMAGE=$(sed -n 's/^FROM \(node:[^ ]*\) AS build$/\1/p' deploy/Dockerfile)
readonly NODE_IMAGE

readonly RUN="glissando-test-$$"
readonly NETWORK=$RUN
readonly UPSTREAM="$RUN-immich"
readonly PROXY="$RUN-proxy"
readonly UNSET="$RUN-unset"
readonly KEY_FILE_PROXY="$RUN-keyfile"
readonly STARTUP="$RUN-startup"
readonly LIBRARY="$RUN-library"
readonly VOLUME="$RUN-data"
readonly IMMICH_URL="http://$UPSTREAM:2283"
readonly KEY=TestServerKey0123456789abcdefXYZ
readonly UUID=0b5a7c3e-1f2d-4e6a-9b8c-7d6e5f4a3b2c
readonly CLIENT_CREDENTIALS=(
	-H "x-api-key: client-key"
	-H "Cookie: immich_access_token=client-cookie"
	-H "Authorization: Bearer client-token"
	-H "x-immich-share-key: client-share"
)
# Every credential a client sends, in its headers or its query; none may reach a log.
readonly CLIENT_SECRETS=(client-key client-cookie client-token client-share client-query)
# The fake's own sign-in cookie; the route drops it on the way back.
readonly UPSTREAM_COOKIE=upstream-cookie
readonly WAIT_SECONDS=60
readonly DISCOVERY='{"service":"glissando-library","version":1}'
readonly TITLE="Image test slideshow"
document() { # title
	printf '{"format":"glissando-server","formatVersion":1,"slideshow":{"title":"%s","createdAt":"2025-10-01T08:00:00Z","secondsPerPicture":5,"pictures":[{"capturedAt":"2025-09-30T10:00:00Z","width":1920,"height":1080,"fileName":"a.jpg","immichAssetId":"%s"}]}}' "$1" "$UUID"
}

WORK=$(mktemp -d)
readonly WORK

cleanup() {
	docker rm --force "$UPSTREAM" "$PROXY" "$UNSET" "$KEY_FILE_PROXY" "$STARTUP" "$LIBRARY" >/dev/null 2>&1 || true
	docker network rm "$NETWORK" >/dev/null 2>&1 || true
	docker volume rm "$VOLUME" >/dev/null 2>&1 || true
	rm -rf "$WORK"
}
trap cleanup EXIT

failures=0
pass() { echo "ok   $1"; }
fail() {
	echo "FAIL $1"
	failures=$((failures + 1))
}
expect_equal() { # name, expected, actual
	if [ "$2" = "$3" ]; then pass "$1"; else fail "$1: expected '$2', got '$3'"; fi
}

wait_for_log() { # container, fixed string
	if ! grep -F -q -m1 -- "$2" < <(timeout "$WAIT_SECONDS" docker logs --follow "$1" 2>&1); then
		echo "FAIL $1 never logged '$2'; its log:"
		docker logs "$1" 2>&1 | tail -n 20
		exit 1
	fi
}

start_proxy() { # name, docker run arguments...
	local name=$1
	shift
	docker run --detach --name "$name" --network "$NETWORK" --publish 127.0.0.1::8080 "$@" "$IMAGE" >/dev/null
	wait_for_log "$name" "serving initial configuration"
}

start_library() { # a fresh container on the same data volume
	docker rm --force "$LIBRARY" >/dev/null 2>&1 || true
	start_proxy "$LIBRARY" --env IMMICH_URL="$IMMICH_URL" --env IMMICH_API_KEY="$KEY" \
		--env GLISSANDO_DATA_DIR=/data --volume "$VOLUME:/data"
	wait_for_log "$LIBRARY" "glissando-library: listening"
}

port_of() { docker port "$1" 8080/tcp | head -n 1 | sed 's/.*://'; }

# Sets STATUS; the body lands in $WORK/body, the headers in $WORK/headers, both appended to
# $WORK/responses for the key check.
request() { # container, method, path, curl arguments...
	local container=$1 method=$2 path=$3
	shift 3
	STATUS=$(curl --silent --path-as-is --request "$method" --output "$WORK/body" \
		--dump-header "$WORK/headers" --write-out '%{http_code}' "$@" \
		"http://127.0.0.1:$(port_of "$container")$path")
	cat "$WORK/headers" >>"$WORK/responses"
	if [ "$STATUS" != 200 ] || [[ "$path" != /immich/* ]]; then
		# Only the fake echoes what it received, the key included; Immich never does.
		cat "$WORK/body" >>"$WORK/responses"
	fi
}

echoed() { # method, url, key: what the fake answers when exactly the server's key arrived
	printf '{"method":"%s","url":"%s","headers":{"x-api-key":"%s","cookie":null,"authorization":null,"x-immich-share-key":null}}' "$1" "$2" "$3"
}

docker network create "$NETWORK" >/dev/null
docker run --detach --name "$UPSTREAM" --network "$NETWORK" --user node \
	--volume "$PWD/deploy/fake-immich.mjs:/fake-immich.mjs:ro" \
	--volume "$PWD/deploy/fake-immich-images.mjs:/fake-immich-images.mjs:ro" "$NODE_IMAGE" node /fake-immich.mjs >/dev/null
wait_for_log "$UPSTREAM" "listening"
start_proxy "$PROXY" --env IMMICH_URL="$IMMICH_URL" --env IMMICH_API_KEY="$KEY"

echo "# the app"
request "$PROXY" GET /
expect_equal "index.html is served at /" 200 "$STATUS"
grep -q "<title>Glissando</title>" "$WORK/body" && pass "/ is Glissando's index.html" || fail "/ is Glissando's index.html"

echo "# allowed reads reach Immich, without the prefix, with only the server's key"
allowed=(
	"GET /immich/api/server/version /api/server/version"
	"GET /immich/api/albums /api/albums"
	"GET /immich/api/assets/$UUID/thumbnail?size=preview /api/assets/$UUID/thumbnail?size=preview"
	"GET /immich/api/assets/$UUID/original /api/assets/$UUID/original"
	"GET /immich/api/faces?id=$UUID /api/faces?id=$UUID"
	"POST /immich/api/search/metadata /api/search/metadata"
	"GET /immich/api/albums?apiKey=client-query&shared=true /api/albums?shared=true"
)
for case in "${allowed[@]}"; do
	read -r method path upstream_url <<<"$case"
	request "$PROXY" "$method" "$path" "${CLIENT_CREDENTIALS[@]}" --data-binary '{"type":"IMAGE"}'
	expect_equal "$method $path reaches Immich as $upstream_url with the server's key" \
		"$(echoed "$method" "$upstream_url" "$KEY")" "$(cat "$WORK/body")"
done

echo "# everything else answers 403 and never reaches Immich"
forbidden=(
	"DELETE /immich/api/assets"
	"GET /immich/api/users/me"
	"PUT /immich/api/albums/x"
	"POST /immich/api/albums"
	"GET /immich/api/search/metadata"
	"GET /immich/api/assets/$UUID/video/playback"
	"GET /immich/api/assets/not-a-uuid-but-thirty-six-characters/original"
	"GET /immich/api/albums/../users/me"
	"GET /immich/api/albums/%2e%2e/users/me"
	"GET /immich/api/server/version/../../users/me"
	"GET /immich/api/assets/$UUID/original/../../../users/me"
	"GET /immich/api//users/me"
	"GET /immich/api/albums//../users/me"
	"GET /immich/api/albums/"
)
for case in "${forbidden[@]}"; do
	read -r method path <<<"$case"
	request "$PROXY" "$method" "$path" "${CLIENT_CREDENTIALS[@]}"
	expect_equal "$method $path answers 403" 403 "$STATUS"
done
# A request after the forbidden ones that does arrive: until it is logged, an absence proves nothing.
request "$PROXY" GET "/immich/api/server/version?sentinel=after-the-forbidden"
wait_for_log "$UPSTREAM" "after-the-forbidden"
received_paths=$(docker logs "$UPSTREAM" 2>&1 | sed -n 's/^request .*"url":"\([^"]*\)".*/\1/p')
expect_equal "Immich received only the allowed reads" \
	"$(printf '%s\n' "${allowed[@]}" | awk '{print $3}'; echo "/api/server/version?sentinel=after-the-forbidden")" \
	"$received_paths"

echo "# the key from a secret file"
printf '%s\n' "$KEY" >"$WORK/immich-api-key"
chmod 0644 "$WORK/immich-api-key"
start_proxy "$KEY_FILE_PROXY" --env IMMICH_URL="$IMMICH_URL" \
	--env IMMICH_API_KEY_FILE=/run/secrets/immich_api_key \
	--volume "$WORK/immich-api-key:/run/secrets/immich_api_key:ro"
request "$KEY_FILE_PROXY" GET /immich/api/albums "${CLIENT_CREDENTIALS[@]}"
expect_equal "a key from IMMICH_API_KEY_FILE reaches Immich, its newline trimmed" \
	"$(echoed GET /api/albums "$KEY")" "$(cat "$WORK/body")"

echo "# Immich not set up"
start_proxy "$UNSET"
request "$UNSET" GET /
expect_equal "without IMMICH_URL the app is still served" 200 "$STATUS"
request "$UNSET" GET /immich/api/server/version
expect_equal "without IMMICH_URL /immich/api/server/version answers 404" 404 "$STATUS"

echo "# Immich down"
docker stop "$UPSTREAM" >/dev/null
request "$PROXY" GET "/immich/api/albums?apiKey=client-query" "${CLIENT_CREDENTIALS[@]}"
expect_equal "with Immich down an allowed read answers 502" 502 "$STATUS"
wait_for_log "$PROXY" '"status":502'
docker logs "$PROXY" 2>&1 | grep '"level":"error"' | grep -q "$UPSTREAM" &&
	pass "the failure to reach Immich is in the container's log" ||
	fail "the failure to reach Immich is in the container's log"

echo "# the key stays inside"
for container in "$PROXY" "$KEY_FILE_PROXY"; do
	docker logs "$container" >"$WORK/log-$container" 2>&1
	grep -q "/immich/api/albums" "$WORK/log-$container" &&
		pass "$container logs its requests" || fail "$container logs its requests"
	grep -q -F "$KEY" "$WORK/log-$container" &&
		fail "$container logs the server's key" || pass "$container never logs the server's key"
	for secret in "${CLIENT_SECRETS[@]}"; do
		grep -q -F "$secret" "$WORK/log-$container" &&
			fail "$container logs the client's $secret" ||
			pass "$container never logs the client's $secret"
	done
done
grep -q '"level":"error"' "$WORK/log-$PROXY" &&
	pass "$PROXY's log has the error entries checked above" ||
	fail "$PROXY's log has the error entries checked above"
grep -q "HTTP/1.1 200" "$WORK/responses" && pass "responses were recorded" || fail "responses were recorded"
grep -q -F "$KEY" "$WORK/responses" &&
	fail "a response carries the server's key" || pass "no response carries the server's key"
grep -q -F "$UPSTREAM_COOKIE" "$WORK/responses" &&
	fail "a response carries Immich's cookie" || pass "no response carries Immich's cookie"

echo "# slideshows on the server"
request "$PROXY" GET /api/library
expect_equal "without a data volume /api/library answers 404" 404 "$STATUS"
start_library
request "$LIBRARY" GET /api/library
expect_equal "with a data volume /api/library answers the discovery" "200 $DISCOVERY" "$STATUS $(cat "$WORK/body")"
request "$LIBRARY" POST /api/library/slideshows -H "Content-Type: application/json" --data-binary "$(document "$TITLE")"
expect_equal "a slideshow is created" 201 "$STATUS"
id=$(sed -n 's/^{"id":"\([0-9a-f-]*\)".*/\1/p' "$WORK/body")
start_library
request "$LIBRARY" GET "/api/library/slideshows/$id"
expect_equal "the slideshow survives a new container on the same volume" 200 "$STATUS"
grep -q -F "$TITLE" "$WORK/body" && pass "the slideshow read back is the one created" ||
	fail "the slideshow read back is the one created: $(cat "$WORK/body")"
request "$LIBRARY" PUT "/api/library/slideshows/$id" -H 'If-Match: "1"' --data-binary "$(document "Edited")"
expect_equal "a PUT naming the current revision is accepted" 200 "$STATUS"
request "$LIBRARY" PUT "/api/library/slideshows/$id" -H 'If-Match: "1"' --data-binary "$(document "Stale")"
expect_equal "a PUT naming a stale revision answers 412" 412 "$STATUS"
request "$LIBRARY" GET /api/library/unknown
expect_equal "an unknown library path answers 404" 404 "$STATUS"
docker logs "$LIBRARY" >"$WORK/log-library" 2>&1
grep -q -F "glissando-library: PUT /api/library/slideshows/$id 412" "$WORK/log-library" &&
	pass "the library service logs its requests" || fail "the library service logs its requests"
grep -q -F "Stale" "$WORK/log-library" && fail "the library log has a body" ||
	pass "the library log never has a body"
docker exec "$LIBRARY" pkill -f glissando-library.mjs
expect_equal "the container stops when the library service ends" stopped \
	"$(timeout "$WAIT_SECONDS" docker wait "$LIBRARY" >/dev/null && echo stopped)"

echo "# invalid settings stop the start"
startup_fails() { # name, text the error must contain, docker run arguments...
	local name=$1 expected=$2
	shift 2
	local output status=0
	output=$(timeout "$WAIT_SECONDS" docker run --rm --name "$STARTUP" "$@" "$IMAGE" 2>&1) || status=$?
	docker rm --force "$STARTUP" >/dev/null 2>&1 || true
	if [ "$status" -ne 0 ] && [ "$status" -ne 124 ] && grep -q -F -- "$expected" <<<"$output"; then
		pass "$name"
	else
		fail "$name: exit $status, output: $output"
	fi
}
startup_fails "IMMICH_URL without a key fails, naming the key settings" IMMICH_API_KEY_FILE \
	--env IMMICH_URL="$IMMICH_URL"
startup_fails "a key without IMMICH_URL fails" IMMICH_URL --env IMMICH_API_KEY="$KEY"
startup_fails "both key settings fail" "keep one" --env IMMICH_URL="$IMMICH_URL" \
	--env IMMICH_API_KEY="$KEY" --env IMMICH_API_KEY_FILE=/run/secrets/immich_api_key
startup_fails "an unreadable key file fails" IMMICH_API_KEY_FILE --env IMMICH_URL="$IMMICH_URL" \
	--env IMMICH_API_KEY_FILE=/run/secrets/missing
startup_fails "an IMMICH_URL with a path fails" "IMMICH_URL=" \
	--env IMMICH_URL="$IMMICH_URL/api" --env IMMICH_API_KEY="$KEY"
startup_fails "an unknown setting fails, naming it" IMMICH_APIKEY \
	--env IMMICH_URL="$IMMICH_URL" --env IMMICH_APIKEY="$KEY"
startup_fails "GLISSANDO_DATA_DIR without IMMICH_URL fails, naming both" \
	"GLISSANDO_DATA_DIR is set but IMMICH_URL is not" --env GLISSANDO_DATA_DIR=/data
startup_fails "a data directory the container cannot write fails" "not a writable directory" \
	--env IMMICH_URL="$IMMICH_URL" --env IMMICH_API_KEY="$KEY" --env GLISSANDO_DATA_DIR=/srv

if [ "$failures" -ne 0 ]; then
	echo "$failures check(s) failed"
	exit 1
fi
echo "all checks passed"
