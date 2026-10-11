#!/usr/bin/env bash
# Writes the music conversion's test fixtures (ADR-0020): half a second of a generated 440 Hz
# sine tone in each format the browser tests convert, as small as each format allows. Generated
# audio only, never a real recording. Needs ffmpeg with libopencore-amrnb.
set -euo pipefail
out="$(cd "$(dirname "$0")/.." && pwd)/src/import/testing/audio"
mkdir -p "$out"
tone=(-f lavfi -i "sine=frequency=440:duration=0.5:sample_rate=44100" -ac 2)
encode() { # file, then ffmpeg output options
  local file="$1"
  shift
  ffmpeg -hide_banner -loglevel error -y "${tone[@]}" "$@" -map_metadata -1 -fflags +bitexact \
    "$out/$file"
}
encode alac.m4a -c:a alac -sample_fmt s32p
encode aiff.aiff -c:a pcm_s16be
encode caf-alac.caf -c:a alac
encode ac3.ac3 -c:a ac3 -b:a 96k
encode eac3.eac3 -c:a eac3 -b:a 96k
encode wma.wma -c:a wmav2 -b:a 64k
encode vorbis.ogg -c:a libvorbis -q:a 0
encode vorbis.webm -c:a libvorbis -q:a 0
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "sine=frequency=440:duration=0.5:sample_rate=8000" \
  -c:a libopencore_amrnb -b:a 12.2k -map_metadata -1 -fflags +bitexact "$out/amr.amr"
ls -l "$out"
