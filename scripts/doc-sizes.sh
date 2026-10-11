#!/usr/bin/env bash
# Fails when a dev-docs spec has grown past the point it should be split into one file per
# section (see dev-docs/APP.md and the split specs — dev-docs/LIBRARY.md and its siblings — for
# the pattern). ADRs record a decision as it was made and are never split; dev-docs/app/ already
# holds one file per screen/topic with no further sections to split on, so both are excluded.
set -euo pipefail
cd "$(dirname "$0")/.."

limit_bytes=10240
failed=0

while IFS= read -r -d '' file; do
  bytes="$(wc -c <"$file")"
  if ((bytes > limit_bytes)); then
    echo "FAIL $file is $bytes bytes, over the ${limit_bytes}-byte limit"
    failed=1
  fi
done < <(find dev-docs -name '*.md' -not -path 'dev-docs/adr/*' -not -path 'dev-docs/app/*' -print0)

exit "$failed"
