#!/usr/bin/env bash
# Fails when two e2e cases share an id: docs and reviews cite cases by id, so a duplicate makes a
# citation ambiguous.
set -euo pipefail
cd "$(dirname "$0")/.."

# The id is the first word of a case's title: test("E2E-012 …") or test.skip("E2E-012 …").
duplicates="$(grep -rhoE "^\s*test(\.[a-z]+)?\(\s*[\"'\`]E2E-[0-9]+" e2e |
  grep -oE 'E2E-[0-9]+$' | sort | uniq -d)"

if [[ -n "$duplicates" ]]; then
  while IFS= read -r id; do
    echo "FAIL $id names more than one e2e case:"
    grep -rnE "^\s*test(\.[a-z]+)?\(\s*[\"'\`]$id\b" e2e
  done <<<"$duplicates"
  exit 1
fi
