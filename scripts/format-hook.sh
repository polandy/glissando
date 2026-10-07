#!/usr/bin/env bash
# Claude Code PostToolUse hook: formats the file an Edit/Write just touched.
# Reads the hook payload on stdin; never fails the edit.
file="$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).tool_input?.file_path??"")}catch{}})')"
repo="$(cd "$(dirname "$0")/.." && pwd)"
case "$file" in
  "$repo"/*) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] && [ -d "$repo/node_modules" ] || exit 0
cd "$repo" && npx --no-install prettier --write --ignore-unknown --log-level silent "$file" || true
