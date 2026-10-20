#!/usr/bin/env bash
# Runs a command in the same digest-pinned Playwright image as CI, so every engine (Chromium,
# Firefox, WebKit) works on any Linux host, e.g. scripts/ci-image.sh npx playwright test
# CI_IMAGE_CPUS=<n> limits the container to n CPUs, e.g. to overload it on purpose.
set -euo pipefail
cd "$(dirname "$0")/.."
image="$(sed -n 's/^ *image: *\(mcr\.microsoft\.com\/playwright@[^ ]*\).*/\1/p' .github/workflows/ci.yml)"
exec docker run --rm --init --ipc=host ${CI_IMAGE_CPUS:+--cpus="$CI_IMAGE_CPUS"} --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -e GLISSANDO_COMMIT="$(git rev-parse HEAD)" -e GLISSANDO_COMMIT_DATE="$(git log -1 --format=%cI)" \
  -v "$PWD:/work" -w /work "$image" "$@"
