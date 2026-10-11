#!/usr/bin/env bash
# Runs a test command quietly: on success one line with its summary; on failure its output
# without the lines matching the noise pattern (progress, dev-server logs), so what is left is
# the failing cases and the summary.
# Usage: scripts/quiet.sh <name> <summary-line-pattern> <noise-line-pattern> <command…>
set -uo pipefail
name="$1"
summary_pattern="$2"
noise_pattern="$3"
shift 3

output="$("$@" 2>&1)"
status=$?
if [ "$status" -eq 0 ]; then
  summary="$(sed -E $'s/\x1b\[[0-9;]*m//g' <<<"$output" | grep -E "$summary_pattern" | tail -n 1 | sed -E 's/^[[:space:]]+//')"
  echo "ok   $name: $summary"
else
  echo "FAIL $name"
  grep -vE "$noise_pattern" <<<"$output" | cat -s
fi
exit "$status"
