# Sourced by deploy/test-image.sh, after the route checks and with its harness: with a data
# volume the library service answers /api/library and keeps what it stores across containers
# (ADR-0018); docker stop ends the container cleanly, a dead service stops it with its status.
# Without a data volume, /api/library answers 404.

readonly DISCOVERY='{"service":"glissando-library","version":1}'
readonly TITLE="Image test slideshow"
# One byte past the library's 2 MiB document limit (MAX_DOCUMENT_BYTES).
readonly OVERSIZED_DOCUMENT_BYTES=$((2 * 1024 * 1024 + 1))
# A process killed by SIGKILL: 128 + 9.
readonly KILLED_STATUS=137
document() { # title
	printf '{"format":"glissando-server","formatVersion":1,"slideshow":{"title":"%s","createdAt":"2025-10-01T08:00:00Z","secondsPerPicture":5,"pictures":[{"capturedAt":"2025-09-30T10:00:00Z","width":1920,"height":1080,"fileName":"a.jpg","immichAssetId":"%s"}]}}' "$1" "$UUID"
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
docker logs "$LIBRARY" >"$WORK/log-library" 2>&1
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
