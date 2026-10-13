# Sourced by deploy/test-image-library.sh with its harness, while the library container runs, the
# fake Immich is up and the slideshow $id is shared by $token: the TV remote through Caddy
# (ADR-0031, dev-docs/tv_remote/END_TO_END.md). A session made on the public API is claimed and
# shown on the private one, its stream carries `show` unbuffered and its picture comes from Immich;
# a way B session's command reaches a TV with its stream open.

readonly JSON=(-H "Content-Type: application/json")

json_field() { # name: its string value in $WORK/body
	sed -n "s/.*\"$1\":\"\([A-Za-z0-9_-]*\)\".*/\1/p" "$WORK/body"
}

open_stream() { # path, file: the stream's events land in the file as they arrive
	local url
	url="http://127.0.0.1:$(port_of "$LIBRARY")$1"
	# The file exists before curl starts, so stream_carries can follow it at once.
	: >"$2"
	curl --silent --no-buffer --max-time "$WAIT_SECONDS" "$url" >>"$2" &
}

stream_carries() { # name, file, fixed string: passes once the stream has written the string
	if grep -F -q -m1 -- "$3" < <(timeout "$WAIT_SECONDS" tail -f -n +1 "$2"); then
		pass "$1"
	else
		fail "$1: the stream wrote $(cat "$2")"
	fi
}

echo "# the TV remote"
request "$PROXY" POST /api/tv/sessions "${JSON[@]}" --data-binary '{}'
expect_equal "without a data volume /api/tv/ answers 404" 404 "$STATUS"
request "$LIBRARY" POST /api/tv/sessions "${JSON[@]}" --data-binary '{}'
expect_equal "a TV makes a session on the public API" 201 "$STATUS"
tv_key=$(json_field tvKey)
code=$(json_field code)
expect_equal "the TV's key is 22 base64url characters" 22 "${#tv_key}"
open_stream "/api/tv/$tv_key/events" "$WORK/tv-stream"
stream_carries "the TV's stream opens with a snapshot" "$WORK/tv-stream" "event: snapshot"
request "$LIBRARY" POST /api/library/tv/claim "${JSON[@]}" --data-binary "{\"code\":\"$code\"}"
expect_equal "the phone claims the code on the private API" 200 "$STATUS"
remote_secret=$(json_field remoteSecret)
request "$LIBRARY" POST "/api/library/tv/$remote_secret/show" "${JSON[@]}" \
	--data-binary "{\"slideshowId\":\"$id\"}"
expect_equal "the phone chooses the slideshow" 204 "$STATUS"
stream_carries "the TV's stream carries show at once" "$WORK/tv-stream" "event: show"
request "$LIBRARY" GET "/api/tv/$tv_key/show"
expect_equal "the TV reads the chosen slideshow on its key, never stored" "200 no-store" \
	"$STATUS $(header_value Cache-Control)"
revision=$(sed -n 's/^{"revision":\([0-9]*\),.*/\1/p' "$WORK/body")
request "$LIBRARY" GET "/api/tv/$tv_key/show/$revision/pictures/0?apiKey=client-query" \
	"${CLIENT_CREDENTIALS[@]}"
expect_equal "the TV's picture is Immich's preview, fetched with the server's key only" \
	"200 $(echoed GET "/api/assets/$UUID/thumbnail?size=preview" "$KEY")" "$STATUS $(cat "$WORK/body")"
expect_equal "the TV's picture carries no header but the allowed ones" "$PICTURE_HEADERS" "$(header_names)"

request "$LIBRARY" POST "/api/share/$token/tv" "${JSON[@]}" --data-binary '{}'
expect_equal "a TV on a share link makes a session bound to it" 201 "$STATUS"
bound_key=$(json_field tvKey)
bound_secret=$(json_field remoteSecret)
request "$LIBRARY" POST "/api/tv/remote/$bound_secret/command" "${JSON[@]}" --data-binary '{"type":"play"}'
expect_equal "a command answers 409 tvAway while the TV has no stream open" 409 "$STATUS"
open_stream "/api/tv/$bound_key/events" "$WORK/bound-stream"
stream_carries "the bound TV's stream opens with a snapshot" "$WORK/bound-stream" "event: snapshot"
request "$LIBRARY" POST "/api/tv/remote/$bound_secret/command" "${JSON[@]}" --data-binary '{"type":"pause"}'
expect_equal "the remote's command is accepted" 204 "$STATUS"
stream_carries "the command reaches the TV's stream" "$WORK/bound-stream" '"type":"pause"'

request "$LIBRARY" GET "/r/$bound_secret"
expect_equal "/r/<secret> answers remote.html, revalidated, without a referrer" \
	"200 no-cache no-referrer" \
	"$STATUS $(header_value Cache-Control) $(header_value Referrer-Policy)"
request "$LIBRARY" GET /tv
expect_equal "/tv answers the recipient's page, revalidated, without a referrer" \
	"200 no-cache no-referrer" \
	"$STATUS $(header_value Cache-Control) $(header_value Referrer-Policy)"
tv_probes=(
	"GET /api/tv/$tv_key/state"
	"POST /api/tv/$tv_key/events"
	"GET /api/tv/${tv_key}A/events"
	"GET /API/TV/$tv_key/events"
	"GET /api/tv/$tv_key/show/$revision/pictures/%30"
	"GET /api/tv/%2e%2e/share/$token"
	"DELETE /api/tv/sessions"
	"GET /api/tv/remote/$bound_secret/command"
	"GET /r/${bound_secret}A"
	"POST /r/$bound_secret"
	"GET /tv/extra"
	"POST /tv"
	"GET /internal/tv-picture/$tv_key/0"
)
for case in "${tv_probes[@]}"; do
	read -r method path <<<"$case"
	request "$LIBRARY" "$method" "$path"
	expect_equal "$method $path answers 404" 404 "$STATUS"
done

for secret in "$remote_secret" "$bound_secret"; do
	request "$LIBRARY" POST "/api/tv/remote/$secret/command" "${JSON[@]}" --data-binary '{"type":"disconnect"}'
	expect_equal "disconnect ends the session" 204 "$STATUS"
done
stream_carries "the TV's stream ends with the session" "$WORK/tv-stream" "event: end"
# Caddy logs a stream once it has ended: until that line is there, an absence proves nothing.
wait_for_log "$LIBRARY" '"uri":"/api/tv/…/events"'
docker logs "$LIBRARY" >"$WORK/log-tv" 2>&1
grep -q -F "glissando-library: POST /api/library/tv/…/show 204" "$WORK/log-tv" &&
	pass "the library service logs TV requests with the secret replaced" ||
	fail "the library service logs TV requests with the secret replaced"
grep -q -F -e "$tv_key" -e "$remote_secret" -e "$bound_key" -e "$bound_secret" "$WORK/log-tv" &&
	fail "the container logs a TV key or secret: $(grep -F -e "$tv_key" -e "$remote_secret" \
		-e "$bound_key" -e "$bound_secret" "$WORK/log-tv" | head -n 3)" ||
	pass "the container never logs a TV key or secret"
