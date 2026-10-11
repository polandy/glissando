#!/usr/bin/env bash
# Builds the music decoder of ADR-0020: libav.js with only the codecs music conversion needs,
# single-threaded, into src/import/libav/. Run by hand when a pin below changes; CI never runs
# it, it checks the committed files' sha256 (src/import/libav/libav-pin.test.ts).
set -euo pipefail

LIBAV_TAG=v6.10.9.0
LIBAV_COMMIT=c80e885c3461f7bb7ea565c9631b34243ae0dbf1
LIBAV_VERSION=6.10.9.0
# libav.js's Makefile fetches these unverified; they are fetched and checked here first.
FFMPEG_VERSION=9.0
FFMPEG_SHA256=7f607a00dd0d28a729d5a4811205812eef01cf6ef6155025febb6f36a9062d52
EMFT_VERSION=1.3
EMFT_SHA256=0fe933d7742de3b3213608e0fb087a1ae0d060604d5835f7c9cdfcee0fc8cbcb
# emsdk 6.0.5 (multi-platform index), the version libav.js's own CI builds with.
EMSDK_IMAGE=emscripten/emsdk@sha256:76a44fff907397784decc435115d07fcb9587a4f1504977f39f3745e538e3a1e
VARIANT=glissando-audio
FRAGMENTS='["avformat","avcodec","decoder-alac","demuxer-aiff","demuxer-mp4","demuxer-caf","decoder-ac3","demuxer-ac3",
"decoder-eac3","demuxer-eac3","parser-ac3","decoder-wmav1","decoder-wmav2","demuxer-asf","decoder-amrnb",
"demuxer-amr","decoder-vorbis","demuxer-ogg","demuxer-webm","encoder-flac","muxer-flac"]'

repo="$(cd "$(dirname "$0")/.." && pwd)"
out="$repo/src/import/libav"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

git clone --quiet --depth 1 --branch "$LIBAV_TAG" https://github.com/Yahweasel/libav.js "$work/src"
actual="$(git -C "$work/src" rev-parse HEAD)"
if [ "$actual" != "$LIBAV_COMMIT" ]; then
  echo "libav.js $LIBAV_TAG is commit $actual, expected $LIBAV_COMMIT" >&2
  exit 1
fi

fetch() { # url file sha256
  curl --silent --show-error --fail --location "$1" -o "$work/src/build/$2"
  echo "$3  $work/src/build/$2" | sha256sum --check --quiet -
}
mkdir -p "$work/src/build"
fetch "https://ffmpeg.org/releases/ffmpeg-$FFMPEG_VERSION.tar.xz" \
  "ffmpeg-$FFMPEG_VERSION.tar.xz" "$FFMPEG_SHA256"
fetch "https://github.com/Yahweasel/emfiberthreads/archive/refs/tags/v$EMFT_VERSION.tar.gz" \
  "emfiberthreads-$EMFT_VERSION.tar.gz" "$EMFT_SHA256"

loader="dist/libav-$LIBAV_VERSION-$VARIANT.mjs"
factory="dist/libav-$LIBAV_VERSION-$VARIANT.wasm.mjs"
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -v "$work/src:/src" -w /src \
  "$EMSDK_IMAGE" sh -c "cd configs && node mkconfig.js $VARIANT '$(tr -d '\n' <<<"$FRAGMENTS")' \
    && cd .. && make -j$(nproc) $loader $factory"

mkdir -p "$out"
cp "$work/src/$loader" "$work/src/$factory" \
  "$work/src/dist/libav-$LIBAV_VERSION-$VARIANT.wasm.wasm" "$out/"
# The licences (FFmpeg's LGPL-2.1 among them) are the factory's header comment.
sed -n '1,/\*\//p' "$work/src/$factory" | sed -e '1d;$d' -e 's/^ \* \{0,1\}//' >"$out/LICENSE.md"
(cd "$out" && sha256sum libav-*.mjs libav-*.wasm)
