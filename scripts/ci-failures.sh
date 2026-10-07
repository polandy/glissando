#!/usr/bin/env bash
# Prints only the failed steps' logs of the latest CI run on a branch (default: current).
set -euo pipefail
branch="${1:-$(git branch --show-current)}"
run_id="$(gh run list --branch "$branch" --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run view "$run_id" --log-failed
