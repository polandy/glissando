#!/usr/bin/env bash
# Fails when the app shows an Error's own message to the user. Failures are mapped to a sentence
# with a way out (src/app/export-errors/describe-export-failure.ts); the raw text goes to the
# console and into a "Show details" fold. Checked: `error.message` / `err.message` / `e.message`
# in any .svelte file and in the app's .ts files (src/app) other than tests, src/app/errors/ (the reporter) and src/app/export-errors/
# (the mapping). Workers and parsers outside src/app carry messages as data and are not checked.
set -uo pipefail
cd "$(dirname "$0")/.."

direct='\b(error|err|e)\.message\b'
hits="$(
  {
    grep -rnE "$direct" src --include='*.svelte'
    grep -rnE "$direct" src/app --include='*.ts' \
      --exclude='*.test.ts' --exclude-dir=errors --exclude-dir=export-errors
  } || true
)"

if [[ -n "$hits" ]]; then
  echo "FAIL an error's message reaches the user; map it with describeExportFailure instead:"
  echo "$hits"
  exit 1
fi
