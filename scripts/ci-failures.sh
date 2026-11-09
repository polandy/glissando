#!/usr/bin/env bash
# Prints only the failed steps' logs of the latest failed CI run on a branch (default: current).
set -euo pipefail
branch="${1:-$(git branch --show-current)}"
run_id="$(gh run list --branch "$branch" --status failure --limit 1 --json databaseId --jq '.[0].databaseId // empty')"
[ -n "$run_id" ] || { echo "no failed CI run on $branch" >&2; exit 1; }
gh run view "$run_id" --log-failed
