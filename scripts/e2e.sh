#!/usr/bin/env bash
# Runs the Playwright e2e cases in the CI image. Arguments go to `playwright test`,
# e.g. scripts/e2e.sh --project=webkit e2e/start-animation.spec.ts
exec "$(dirname "$0")/ci-image.sh" npx playwright test "$@"
