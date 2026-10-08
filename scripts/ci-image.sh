#!/usr/bin/env bash
# Runs a command in the same digest-pinned Playwright image as CI, so every engine (Chromium,
# Firefox, WebKit) works on any Linux host, e.g. scripts/ci-image.sh npx playwright test
set -euo pipefail
cd "$(dirname "$0")/.."
image="$(sed -n 's/^ *image: *\([^ ]*\).*/\1/p' .github/workflows/ci.yml)"
exec docker run --rm --init --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD:/work" -w /work "$image" "$@"
