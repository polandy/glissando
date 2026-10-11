#!/usr/bin/env bash
# Runs the Vitest browser tests (*.browser.test.ts) in the CI image. Arguments go to
# `vitest run`, e.g. scripts/browser-tests.sh src/player/webgl
# Quiet on success; on failure only the failing cases and the summary.
dir="$(dirname "$0")"
exec "$dir/quiet.sh" browser-tests '^ +Tests +' '^npm notice' \
  "$dir/ci-image.sh" npx vitest run --project browser --reporter=dot "$@"
