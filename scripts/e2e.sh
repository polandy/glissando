#!/usr/bin/env bash
# Runs the Playwright e2e cases in the CI image. Arguments go to `playwright test`,
# e.g. scripts/e2e.sh --project=webkit e2e/start-animation.spec.ts
# Quiet on success; on failure only the failing cases and the summary.
dir="$(dirname "$0")"
exec "$dir/quiet.sh" e2e '^ +[0-9]+ passed' \
  '^\[WebServer\]|^\[[0-9]+/[0-9]+\] |^Running [0-9]+ tests|^npm notice' \
  "$dir/ci-image.sh" npx playwright test --reporter=line "$@"
