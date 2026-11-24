#!/usr/bin/env bash
# The verify-before-finishing target; CI runs exactly this. Quiet on success,
# a failing step's output in full. The steps are independent and run in parallel.
set -uo pipefail
cd "$(dirname "$0")/.."

steps=(
  "format:npx prettier --check --cache ."
  "doc-sizes:scripts/doc-sizes.sh"
  "source-sizes:scripts/source-sizes.sh"
  "raw-error-text:scripts/no-raw-error-text.sh"
  "unused-exports:scripts/unused-exports.sh"
  "pins:scripts/pins.sh"
  "e2e-ids:scripts/e2e-ids.sh"
  "lint:npx eslint --concurrency auto ."
  "typecheck:npx svelte-check --fail-on-warnings"
  "typecheck-sw:npx tsc -p src/sw/tsconfig.json"
  "build:npx vite build"
  "build-server:npm run --silent build:server"
)
# The kernels' rebuild needs Docker; without it the unit test's source fingerprint still catches a stale .wasm.
if docker info >/dev/null 2>&1; then
  steps+=("object-kernels:scripts/build-object-kernels.sh --check")
fi
# The CPU-bound focus tests time out when other steps compete for the cores, so the unit
# tests run alone once the others are done.
final_step="test:npx vitest run --project unit"

outdir="$(mktemp -d)"
trap 'rm -rf "$outdir"' EXIT

failed=0

run_group() {
  local i
  for i in "${!group[@]}"; do
    ${group[$i]#*:} >"$outdir/$i" 2>&1 &
    pids[i]=$!
  done
  for i in "${!group[@]}"; do
    if wait "${pids[$i]}"; then
      echo "ok   ${group[$i]%%:*}"
    else
      echo "FAIL ${group[$i]%%:*}"
      cat "$outdir/$i"
      failed=1
    fi
  done
}

group=("${steps[@]}")
run_group
group=("$final_step")
run_group
exit "$failed"
