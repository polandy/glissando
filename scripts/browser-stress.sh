#!/usr/bin/env bash
# Runs browser test files repeatedly in the CI image on few CPUs with many workers, to show
# whether a test holds under overload, e.g.
#   scripts/browser-stress.sh webkit 10 1 12 src/share-page src/player/webgl
# One line per run (its summary or the failing cases), then the pass count.
# Usage: scripts/browser-stress.sh <engine> <runs> <cpus> <workers> <vitest args…>
set -uo pipefail
dir="$(dirname "$0")"
engine="$1" runs="$2" cpus="$3" workers="$4"
shift 4
passed=0
for run in $(seq 1 "$runs"); do
  output="$(CI_IMAGE_CPUS="$cpus" "$dir/ci-image.sh" npx vitest run --project "browser ($engine*)" \
    --reporter=dot --maxWorkers="$workers" "$@" 2>&1 | sed -E $'s/\x1b\\[[0-9;]*m//g')"
  if grep -qE '^ +Tests +[0-9]+ passed' <<<"$output"; then
    passed=$((passed + 1))
    echo "run $run: ok"
  else
    echo "run $run: FAIL"
    grep -E "^ FAIL |Error|Tests |No test files" <<<"$output" | sed "s/^/  /"
  fi
done
echo "$engine: $passed of $runs runs passed ($cpus CPU, $workers workers)"
