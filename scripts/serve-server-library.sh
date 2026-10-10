#!/usr/bin/env bash
# Serves the self-hosted image with slideshows on the server on the LAN, to try from a phone:
# a fake Immich with generated photos (deploy/fake-immich.mjs, gallery mode) on a private
# network, the Glissando container pointed at it with a fake key and a temporary data volume.
# Everything it starts is removed on exit or Ctrl-C.
#
#   scripts/serve-server-library.sh <port>             with three seeded server slideshows
#   scripts/serve-server-library.sh <port> --no-seed   with an empty server library
#
# Every wait is on a log line the awaited state writes, never on a timer; the timeout only
# bounds a hang.
set -euo pipefail
cd "$(dirname "$0")/.."

# Ports other sessions on this machine serve on.
readonly TAKEN_PORTS=(4180 4188 4191 4197 4215 4233 5180)
readonly USAGE="usage: $0 <port> [--no-seed]"

port=${1:-}
seed=true
[ $# -ge 1 ] && [ $# -le 2 ] || { echo "$USAGE" >&2; exit 2; }
if [ $# -eq 2 ]; then
	[ "$2" = --no-seed ] || { echo "$USAGE" >&2; exit 2; }
	seed=false
fi
[[ "$port" =~ ^[0-9]{1,5}$ ]] && [ "$port" -ge 1024 ] && [ "$port" -le 65535 ] ||
	{ echo "the port must be a number from 1024 to 65535; $USAGE" >&2; exit 2; }
for taken in "${TAKEN_PORTS[@]}"; do
	if [ "$port" = "$taken" ]; then
		echo "port $port is used by another session; pick another (not ${TAKEN_PORTS[*]})" >&2
		exit 2
	fi
done
if ss -Hltn "sport = :$port" | grep -q .; then
	echo "port $port is already in use on this machine; pick another" >&2
	exit 2
fi

readonly RUN="glissando-serve-$port"
readonly IMAGE="glissando:serve-server-library"
readonly NETWORK=$RUN
readonly IMMICH="$RUN-immich"
readonly APP="$RUN-app"
readonly VOLUME="$RUN-data"
readonly KEY=FakeImmichKey0123456789abcdefXYZ
readonly WAIT_SECONDS=120
# The fake runs on the build's own Node image, so nothing unpinned is pulled.
NODE_IMAGE=$(sed -n 's/^FROM \(node:[^ ]*\) AS build$/\1/p' deploy/Dockerfile)
readonly NODE_IMAGE

cleanup() {
	echo
	echo "stopping and removing the containers, the network and the data volume"
	docker rm --force "$APP" "$IMMICH" >/dev/null 2>&1 || true
	docker network rm "$NETWORK" >/dev/null 2>&1 || true
	docker volume rm "$VOLUME" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT TERM

wait_for_log() { # container, fixed string
	if ! grep -F -q -m1 -- "$2" < <(timeout "$WAIT_SECONDS" docker logs --follow "$1" 2>&1); then
		echo "$1 never logged '$2'; its log:" >&2
		docker logs "$1" 2>&1 | tail -n 20 >&2
		exit 1
	fi
}

echo "building the image from deploy/Dockerfile"
docker build --quiet --tag "$IMAGE" --file deploy/Dockerfile . >/dev/null

docker network create "$NETWORK" >/dev/null
docker volume create "$VOLUME" >/dev/null
echo "starting the fake Immich (drawing its photos)"
docker run --detach --name "$IMMICH" --network "$NETWORK" --user node --env FAKE_IMMICH_API_KEY="$KEY" \
	--volume "$PWD/deploy/fake-immich.mjs:/fake-immich.mjs:ro" "$NODE_IMAGE" \
	node /fake-immich.mjs gallery >/dev/null
wait_for_log "$IMMICH" "listening"

echo "starting Glissando"
docker run --detach --name "$APP" --network "$NETWORK" --publish "0.0.0.0:$port:8080" \
	--env IMMICH_URL="http://$IMMICH:2283" --env IMMICH_API_KEY="$KEY" \
	--env GLISSANDO_DATA_DIR=/data --volume "$VOLUME:/data" "$IMAGE" >/dev/null
wait_for_log "$APP" "serving initial configuration"
wait_for_log "$APP" "glissando-library: listening"

if [ "$seed" = true ]; then
	while IFS= read -r document; do
		status=$(curl --silent --output /dev/null --write-out '%{http_code}' \
			--header "Content-Type: application/json" --data-binary "$document" \
			"http://127.0.0.1:$port/api/library/slideshows")
		[ "$status" = 201 ] || { echo "seeding a slideshow answered $status" >&2; exit 1; }
	done < <(docker exec "$IMMICH" node /fake-immich.mjs seed-documents)
	echo "seeded the server slideshows"
fi

lan_ip=$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p')
echo
echo "Glissando with server slideshows: http://${lan_ip:-<this machine>}:$port"
echo "Ctrl-C stops it and removes everything it started."
# In the background, so a signal to this script alone ends the wait at once.
docker wait "$APP" >/dev/null &
wait $!
echo "the Glissando container stopped; its log:" >&2
docker logs "$APP" 2>&1 | tail -n 20 >&2
exit 1
