#!/usr/bin/env bash
# Runs the Vitest browser tests (*.browser.test.ts) in the CI image. Arguments go to
# `vitest run`, e.g. scripts/browser-tests.sh src/player/webgl
exec "$(dirname "$0")/ci-image.sh" npx vitest run --project browser "$@"
