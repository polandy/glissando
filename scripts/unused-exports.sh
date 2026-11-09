#!/usr/bin/env bash
# Fails when an exported symbol in src/ or server/ is imported by no other file (app, e2e,
# scripts, config). An export used only by its own module loses the `export`; one used nowhere is
# deleted. Svelte files are judged by what they import; their own exports are not checked.
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/unused-exports/cli.ts
