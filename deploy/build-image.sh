#!/usr/bin/env bash
# Builds the self-hosted image from the repository root, naming the commit it is built from:
# the build context leaves .git out, so the settings' version line gets it as build arguments.
#   deploy/build-image.sh [docker build options]
set -euo pipefail
cd "$(dirname "$0")/.."
exec docker build --file deploy/Dockerfile \
	--build-arg GLISSANDO_COMMIT="$(git rev-parse HEAD)" \
	--build-arg GLISSANDO_COMMIT_DATE="$(git log -1 --format=%cI)" \
	"$@" .
