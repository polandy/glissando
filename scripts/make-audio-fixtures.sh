#!/usr/bin/env bash
# Writes the music tests' fixtures: half a second of a generated 440 Hz sine tone in each format
# the browser tests convert (ADR-0020), as small as each format allows, and a constant-bitrate MP3
# without a Xing/Info header, whose length an audio element cannot read from its headers (the
# .glissando check decodes it instead). Generated audio only, never a real recording. Needs
# ffmpeg with libmp3lame and libopencore-amrnb.
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
encode cbr-no-xing.mp3 -c:a libmp3lame -b:a 32k -write_xing 0 -id3v2_version 0
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "sine=frequency=440:duration=0.5:sample_rate=8000" \
  -c:a libopencore_amrnb -b:a 12.2k -map_metadata -1 -fflags +bitexact "$out/amr.amr"
ls -l "$out"
