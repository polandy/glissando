# Sourced by deploy/test-image.sh, after the route checks and with its harness: with a data
# volume the library service answers /api/library and keeps what it stores across containers
# (ADR-0018); docker stop ends the container cleanly, a dead service stops it with its status.
# Without a data volume, /api/library answers 404. A slideshow shared by link plays through
# /api/share/ and its picture comes from Immich's preview through Caddy (ADR-0025).

readonly DISCOVERY='{"service":"glissando-library","version":1}'
readonly TITLE="Image test slideshow"
# One byte past the library's 2 MiB document limit (MAX_DOCUMENT_BYTES).
readonly OVERSIZED_DOCUMENT_BYTES=$((2 * 1024 * 1024 + 1))
# A process killed by SIGKILL: 128 + 9.
readonly KILLED_STATUS=137
# A token no slideshow has: 22 base64url characters, like a real one.
readonly UNKNOWN_TOKEN=AAAAAAAAAAAAAAAAAAAAAA
# What the recipient may learn of a picture: its content headers, the cache rule and the
# referrer rule; Date is the HTTP server's own.
readonly PICTURE_HEADERS="cache-control content-length content-type date etag referrer-policy"
document() { # title
	printf '{"format":"glissando-server","formatVersion":1,"slideshow":{"title":"%s","createdAt":"2025-10-01T08:00:00Z","secondsPerPicture":5,"songs":[],"pictures":[{"capturedAt":"2025-09-30T10:00:00Z","width":1920,"height":1080,"fileName":"a.jpg","immichAssetId":"%s"}]}}' "$1" "$UUID"
}

header_names() { # the response headers' names in $WORK/headers, lower case, sorted
	sed -n 's/^\([A-Za-z0-9-]*\):.*/\1/p' "$WORK/headers" | tr 'A-Z' 'a-z' | sort | xargs
}

header_value() { # name: its value in $WORK/headers
	sed -n "s/^$1: *//Ip" "$WORK/headers" | tr -d '\r'
}

start_library() { # a fresh container on the same data volume
	docker rm --force "$LIBRARY" >/dev/null 2>&1 || true
	start_proxy "$LIBRARY" --env IMMICH_URL="$IMMICH_URL" --env IMMICH_API_KEY="$KEY" \
		--env GLISSANDO_DATA_DIR=/data --volume "$VOLUME:/data"
	wait_for_log "$LIBRARY" "glissando-library: listening"
}

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
request "$LIBRARY" PUT "/api/library/slideshows/$id" -H 'If-Match: "1"' -H "Content-Type: application/json" \
	--data-binary "$(document "Edited")"
expect_equal "a PUT naming the current revision is accepted" 200 "$STATUS"
request "$LIBRARY" PUT "/api/library/slideshows/$id" -H 'If-Match: "2"' --data-binary "$(document "Plain")"
expect_equal "a PUT that is not application/json answers 415" 415 "$STATUS"
request "$LIBRARY" PUT "/api/library/slideshows/$id" -H 'If-Match: "1"' -H "Content-Type: application/json" \
	--data-binary "$(document "Stale")"
expect_equal "a PUT naming a stale revision answers 412" 412 "$STATUS"
head -c "$OVERSIZED_DOCUMENT_BYTES" /dev/zero >"$WORK/oversized"
request "$LIBRARY" POST /api/library/slideshows -H "Content-Type: application/json" \
	--data-binary "@$WORK/oversized"
expect_equal "the client receives 413 for a body over the document limit" 413 "$STATUS"
request "$LIBRARY" GET /api/library/unknown
expect_equal "an unknown library path answers 404" 404 "$STATUS"

echo "# a slideshow shared by link"
# Immich is back after the route checks stopped it; its first start logged "listening" too.
docker start "$UPSTREAM" >/dev/null
[ "$(grep -F -c -m2 listening < <(timeout "$WAIT_SECONDS" docker logs --follow "$UPSTREAM" 2>&1))" = 2 ] ||
	fail "the fake Immich starts again"
request "$PROXY" GET "/api/share/$UNKNOWN_TOKEN"
expect_equal "without a data volume /api/share/ answers 404" 404 "$STATUS"
request "$PROXY" GET "/s/$UNKNOWN_TOKEN"
expect_equal "without a data volume /s/ answers 404" 404 "$STATUS"
request "$LIBRARY" GET "/api/share/$UNKNOWN_TOKEN"
expect_equal "an unknown token answers 404 notShared" "404 notShared" \
	"$STATUS $(sed -n 's/.*"error":"\([a-zA-Z]*\)".*/\1/p' "$WORK/body")"
request "$LIBRARY" POST "/api/library/slideshows/$id/share" -H "Content-Type: application/json" --data-binary '{}'
expect_equal "sharing a slideshow answers 201" 201 "$STATUS"
token=$(sed -n 's/.*"token":"\([A-Za-z0-9_-]*\)".*/\1/p' "$WORK/body")
expect_equal "the token is 22 base64url characters" 22 "${#token}"
request "$LIBRARY" GET "/api/share/$token"
expect_equal "the shared slideshow's document answers 200, never stored" "200 no-store" \
	"$STATUS $(header_value Cache-Control)"
grep -q -F '"revision":2,"slideshow":{"title":"Edited"' "$WORK/body" &&
	pass "the shared document is the slideshow as it is now" ||
	fail "the shared document is the slideshow as it is now: $(cat "$WORK/body")"
grep -q -F -e "$UUID" -e "$id" "$WORK/body" && fail "the shared document names an asset or slideshow id" ||
	pass "the shared document names no asset or slideshow id"
expect_equal "the share API answers with Referrer-Policy no-referrer" no-referrer "$(header_value Referrer-Policy)"
request "$LIBRARY" GET "/api/share/$token/2/pictures/0?apiKey=client-query" "${CLIENT_CREDENTIALS[@]}"
expect_equal "a shared picture is Immich's preview, fetched with the server's key only" \
	"200 $(echoed GET "/api/assets/$UUID/thumbnail?size=preview" "$KEY")" "$STATUS $(cat "$WORK/body")"
expect_equal "a shared picture carries no header but the allowed ones" "$PICTURE_HEADERS" "$(header_names)"
expect_equal "a shared picture keeps Immich's ETag and is kept a day" \
	'"echo-etag" private, max-age=86400' "$(header_value ETag) $(header_value Cache-Control)"
request "$LIBRARY" GET "/api/share/$token/2/pictures/1"
expect_equal "a picture the slideshow does not have answers 404 noSuchPicture" "404 noSuchPicture" \
	"$STATUS $(sed -n 's/.*"error":"\([a-zA-Z]*\)".*/\1/p' "$WORK/body")"
request "$LIBRARY" GET "/api/share/$token/songs/0"
expect_equal "a song the slideshow does not have answers 404 noSuchSong" "404 noSuchSong" \
	"$STATUS $(sed -n 's/.*"error":"\([a-zA-Z]*\)".*/\1/p' "$WORK/body")"
request "$LIBRARY" GET "/internal/share-picture/$token/0"
expect_equal "the service's picture check is not routed from outside" 404 "$STATUS"
# Escaped or dotted paths would reach Immich or another route if Caddy unescaped and cleaned them
# first; a probe query shows up in the fake's log if one ever arrives there.
share_probes=(
	"GET /api/share/%2e%2e/%2e%2e/immich/api/albums?probe=escaped-dots"
	"GET /api/share/../../immich/api/albums?probe=dots"
	"GET /s/%2e%2e/immich/api/albums?probe=escaped-dots-under-s"
	"GET /s/$token/../../immich/api/albums?probe=dots-after-a-token"
	"GET /api/share/$token/2/pictures/%30"
	"GET /api/share/$token/2/pictures/0/extra"
	"GET /api/share/${token}A"
	"GET /api/share/$token/unknown"
	"GET /API/SHARE/$token"
	"GET /S/$token"
	"POST /api/share/$token/2/pictures/0"
	"PUT /api/share/$token/songs/0"
	"DELETE /api/share/$token"
	"POST /s/$token"
)
previews_before=$(docker logs "$UPSTREAM" 2>&1 | grep -c '/thumbnail?size=preview' || true)
for case in "${share_probes[@]}"; do
	read -r method path <<<"$case"
	request "$LIBRARY" "$method" "$path" "${CLIENT_CREDENTIALS[@]}"
	expect_equal "$method $path answers 404" 404 "$STATUS"
done
# A request after the probes that does arrive: until it is logged, an absence proves nothing.
request "$LIBRARY" GET "/immich/api/server/version?sentinel=after-the-share-probes"
wait_for_log "$UPSTREAM" "after-the-share-probes"
docker logs "$UPSTREAM" >"$WORK/log-immich-share-probes" 2>&1
grep -q -F "probe=" "$WORK/log-immich-share-probes" &&
	fail "a share probe reached Immich: $(grep -F "probe=" "$WORK/log-immich-share-probes")" ||
	pass "no share probe reaches Immich"
expect_equal "no share probe fetches a preview from Immich" "$previews_before" \
	"$(grep -c '/thumbnail?size=preview' "$WORK/log-immich-share-probes" || true)"
request "$LIBRARY" GET "/s/$token"
expect_equal "the recipient's page answers with Referrer-Policy no-referrer" no-referrer \
	"$(header_value Referrer-Policy)"
if docker run --rm --entrypoint test "$IMAGE" -f /srv/share.html; then
	expect_equal "/s/<token> answers share.html, revalidated each time" "200 no-cache" \
		"$STATUS $(header_value Cache-Control)"
else
	echo "skip /s/<token> answers share.html: this build has no share.html yet (answered $STATUS)"
fi
docker stop "$UPSTREAM" >/dev/null
request "$LIBRARY" GET "/api/share/$token/2/pictures/0"
expect_equal "with Immich down a shared picture answers 502" 502 "$STATUS"
wait_for_log "$LIBRARY" '"status":502'
docker logs "$LIBRARY" 2>&1 | grep '"level":"error"' | grep -F '/api/share/…/2/pictures/0' >/dev/null &&
	pass "the failure to fetch a shared picture is in the error log, its token replaced" ||
	fail "the failure to fetch a shared picture is in the error log, its token replaced"
request "$LIBRARY" DELETE "/api/library/slideshows/$id/share"
expect_equal "turning the link off answers 204" 204 "$STATUS"
request "$LIBRARY" GET "/api/share/$token/2/pictures/0"
expect_equal "the picture answers 404 once the link is off" 404 "$STATUS"
request "$LIBRARY" GET "/api/share/$token"
expect_equal "the document answers 404 once the link is off" 404 "$STATUS"
docker logs "$LIBRARY" >"$WORK/log-library" 2>&1
grep -q -F "glissando-library: GET /api/share/…/songs/0 404" "$WORK/log-library" &&
	pass "the library service logs share requests with the token replaced" ||
	fail "the library service logs share requests with the token replaced"
grep -q -F '"uri":"/api/share/…/2/pictures/0"' "$WORK/log-library" &&
	pass "Caddy logs share requests with the token replaced" ||
	fail "Caddy logs share requests with the token replaced"
grep -q -F "$token" "$WORK/log-library" &&
	fail "the container logs a share token: $(grep -F "$token" "$WORK/log-library" | head -n 3)" ||
	pass "the container never logs a share token"
grep -q -F "glissando-library: PUT /api/library/slideshows/$id 412" "$WORK/log-library" &&
	pass "the library service logs its requests" || fail "the library service logs its requests"
grep -q -F "Stale" "$WORK/log-library" && fail "the library log has a body" ||
	pass "the library log never has a body"
docker stop "$LIBRARY" >/dev/null
expect_equal "docker stop ends the container with status 0" 0 \
	"$(docker inspect --format '{{.State.ExitCode}}' "$LIBRARY")"
docker logs "$LIBRARY" 2>&1 | grep -F "a process ended" >/dev/null &&
	fail "docker stop logs a process ending" || pass "docker stop logs no process ending"
docker run --rm --entrypoint sh --volume "$PWD/deploy/test-supervise.sh:/test-supervise.sh:ro" \
	"$IMAGE" /test-supervise.sh /usr/local/lib/glissando/supervise.sh || failures=$((failures + 1))
start_library
docker exec "$LIBRARY" pkill -KILL -f glissando-library.mjs
expect_equal "the container stops with the status of a library service that died" "$KILLED_STATUS" \
	"$(timeout "$WAIT_SECONDS" docker wait "$LIBRARY")"
docker logs "$LIBRARY" 2>&1 | grep -F "a process ended with status $KILLED_STATUS" >/dev/null &&
	pass "the log names the status of the process that ended" ||
	fail "the log names the status of the process that ended"
