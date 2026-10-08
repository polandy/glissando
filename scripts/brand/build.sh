#!/usr/bin/env bash
# Rebuilds assets/fonts and the outlined stacked logos in a throwaway venv.
set -euo pipefail
venv="$(mktemp -d)"
trap 'rm -rf "$venv"' EXIT
python3 -m venv "$venv"
"$venv/bin/pip" install --quiet -r "$(dirname "$0")/requirements.txt"
"$venv/bin/python" "$(dirname "$0")/build.py"
"$(dirname "$0")/icons.sh"
