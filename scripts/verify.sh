#!/usr/bin/env bash
# The verify-before-finishing target; CI runs exactly this. Quiet on success,
# a failing step's output in full.
set -uo pipefail
cd "$(dirname "$0")/.."

steps=(
  "format:npx prettier --check ."
  "lint:npx eslint ."
  "typecheck:npx svelte-check --fail-on-warnings"
  "typecheck-sw:npx tsc -p src/sw/tsconfig.json"
  "test:npx vitest run --project unit"
  "build:npx vite build"
)

failed=0
for step in "${steps[@]}"; do
  name="${step%%:*}"
  command="${step#*:}"
  if output="$($command 2>&1)"; then
    echo "ok   $name"
  else
    echo "FAIL $name"
    echo "$output"
    failed=1
  fi
done
exit "$failed"
