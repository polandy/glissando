#!/usr/bin/env bash
# Runs the Playwright e2e cases in the same digest-pinned image as CI, so every engine
# (Chromium, Firefox, WebKit) works on any Linux host. Arguments go to `playwright test`,
# e.g. scripts/e2e.sh --project=webkit e2e/start-animation.spec.ts
set -euo pipefail
cd "$(dirname "$0")/.."
image="$(sed -n 's/^ *image: *\([^ ]*\).*/\1/p' .github/workflows/ci.yml)"
exec docker run --rm --init --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD:/work" -w /work "$image" npx playwright test "$@"
