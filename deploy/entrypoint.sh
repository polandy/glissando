#!/bin/sh
# Validates the container's environment, then starts Caddy with the matching Immich route
# (ADR-0013). Any setting it does not understand stops the start, so a typo never leaves the
# operator believing a setting is in effect.
set -eu

readonly SETTINGS="IMMICH_URL IMMICH_API_KEY IMMICH_API_KEY_FILE"
readonly ROUTE_PROXY=/etc/caddy/immich-proxy.caddy
readonly ROUTE_OFF=/etc/caddy/immich-off.caddy
readonly EXAMPLE_URL=http://immich-server:2283

fail() {
	echo "glissando: $*" >&2
	exit 1
}

is_setting() {
	for known in $SETTINGS; do
		[ "$1" = "$known" ] && return 0
	done
	return 1
}

# Names this image owns: Immich's settings and its own internal ones.
for name in $(env | grep -E '^(IMMICH|GLISSANDO)_[A-Za-z0-9_]*=' | cut -d= -f1); do
	is_setting "$name" || fail "unknown setting $name; the settings are: $SETTINGS"
done

if [ -z "${IMMICH_URL+set}" ]; then
	if [ -n "${IMMICH_API_KEY+set}" ] || [ -n "${IMMICH_API_KEY_FILE+set}" ]; then
		fail "an Immich API key is set but IMMICH_URL is not; set IMMICH_URL (e.g. $EXAMPLE_URL) or remove the key"
	fi
	GLISSANDO_IMMICH_ROUTE=$ROUTE_OFF
	echo "glissando: IMMICH_URL is not set; Immich is off"
else
	# scheme://host[:port] only: Caddy proxies to an address, not to a path.
	echo "$IMMICH_URL" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?/?$' ||
		fail "IMMICH_URL='$IMMICH_URL' is not an address like $EXAMPLE_URL (scheme, host and optional port, no path)"

	if [ -n "${IMMICH_API_KEY+set}" ] && [ -n "${IMMICH_API_KEY_FILE+set}" ]; then
		fail "both IMMICH_API_KEY and IMMICH_API_KEY_FILE are set; keep one"
	elif [ -n "${IMMICH_API_KEY_FILE+set}" ]; then
		[ -r "$IMMICH_API_KEY_FILE" ] ||
			fail "IMMICH_API_KEY_FILE='$IMMICH_API_KEY_FILE' is not a readable file (the container runs as uid $(id -u)); check the secret's path and permissions"
		key=$(tr -d ' \t\r\n' <"$IMMICH_API_KEY_FILE")
	elif [ -n "${IMMICH_API_KEY+set}" ]; then
		key=$IMMICH_API_KEY
	else
		fail "IMMICH_URL is set but no API key; set IMMICH_API_KEY_FILE (a Docker secret) or IMMICH_API_KEY to an Immich API key with album.read, asset.read, asset.view, asset.download and face.read"
	fi
	[ -n "$key" ] || fail "the Immich API key is empty; check IMMICH_API_KEY or IMMICH_API_KEY_FILE"
	echo "$key" | grep -Eq '^[A-Za-z0-9+/=_-]+$' ||
		fail "the Immich API key contains characters an Immich key never has; copy it again into IMMICH_API_KEY or IMMICH_API_KEY_FILE"

	unset IMMICH_API_KEY IMMICH_API_KEY_FILE
	export GLISSANDO_IMMICH_API_KEY="$key"
	GLISSANDO_IMMICH_ROUTE=$ROUTE_PROXY
	echo "glissando: Immich at $IMMICH_URL"
fi

export GLISSANDO_IMMICH_ROUTE
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
