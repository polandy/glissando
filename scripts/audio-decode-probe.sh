#!/usr/bin/env bash
# Measures which audio files each engine decodes with decodeAudioData and <audio>, in the CI
# image (ADR-0020), e.g. scripts/audio-decode-probe.sh src/import/testing/audio. Generated test
# audio only, never a real recording.
exec "$(dirname "$0")/ci-image.sh" node scripts/audio-decode-probe.mjs "$@"
