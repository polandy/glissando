#!/usr/bin/env bash
# Fails when anything we pull in is not pinned to an exact, verifiable version: a package.json
# dependency that is a range or tag, a missing package-lock.json, a container image without
# @sha256:, a GitHub Action not pinned to a full commit SHA with its `# tag` comment.
# Covered: package.json, package-lock.json, Dockerfiles (FROM), docker-compose files and workflow
# `image:`, workflow `uses:`, and image constants in scripts (`*_IMAGE=<literal>`).
set -uo pipefail
cd "$(dirname "$0")/.."

failed=0
fail() {
  echo "FAIL $1"
  failed=1
}

# --- npm: exact versions, committed lockfile ---------------------------------------------------
[[ -f package-lock.json ]] || fail "package-lock.json is missing; commit the lockfile"
while IFS= read -r line; do
  fail "package.json: $line"
done < <(node -e '
  const pkg = JSON.parse(require("node:fs").readFileSync("package.json", "utf8"));
  const exact = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
  const walk = (section, table) => {
    for (const [name, version] of Object.entries(table ?? {})) {
      if (typeof version === "object") walk(`${section}.${name}`, version);
      else if (!exact.test(version)) console.log(`${section} "${name}": "${version}" is not an exact version`);
    }
  };
  for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies", "overrides"])
    walk(section, pkg[section]);
')

# --- container images: @sha256 digest ----------------------------------------------------------
while IFS= read -r -d '' file; do
  while IFS=: read -r number text; do
    stage_names="$(sed -n 's/^FROM .* [Aa][Ss] \([^ ]*\).*/\1/p' "$file")"
    image="$(awk '{ for (i = 2; i <= NF; i++) if ($i !~ /^--/) { print $i; exit } }' <<<"$text")"
    [[ "$image" == scratch ]] && continue
    grep -qxF "$image" <<<"$stage_names" && continue
    [[ "$image" == *@sha256:* ]] || fail "$file:$number image \"$image\" is not pinned by @sha256:"
  done < <(grep -nE '^FROM ' "$file")
done < <(find . -path ./node_modules -prune -o -type f \( -name 'Dockerfile*' -o -name '*.Dockerfile' \) -print0)

while IFS= read -r line; do
  fail "$line is not pinned by @sha256:"
done < <(
  { find . -path ./node_modules -prune -o -type f \( -name 'docker-compose*.y*ml' -o -name 'compose*.y*ml' -o -path './.github/workflows/*.yml' \) -print0 |
    xargs -0 -r grep -nE '^\s*image:\s*\S' || true; } |
    grep -v '@sha256:[0-9a-f]\{64\}' || true
)

while IFS= read -r line; do
  fail "$line is not pinned by @sha256:"
done < <(
  { grep -rnE '^\s*(readonly\s+)?[A-Z_]*IMAGE=[A-Za-z0-9]' scripts deploy --include='*.sh' || true; } |
    grep -v '@sha256:[0-9a-f]\{64\}' || true
)

# --- GitHub Actions: full commit SHA and a `# tag` comment -------------------------------------
if compgen -G '.github/workflows/*.yml' >/dev/null; then
  while IFS=: read -r file number text; do
    uses="$(sed -E 's/^\s*(-\s+)?uses:\s*//' <<<"$text")"
    ref="${uses%% *}"
    [[ "$ref" == ./* ]] && continue
    if [[ "$ref" == docker://* ]]; then
      [[ "$ref" == *@sha256:* ]] || fail "$file:$number action \"$ref\" is not pinned by @sha256:"
      continue
    fi
    [[ "$ref" =~ @[0-9a-f]{40}$ ]] || fail "$file:$number action \"$ref\" is not pinned to a full 40-hex commit SHA"
    [[ "$uses" =~ [[:space:]]\#[[:space:]]*v?[0-9] ]] || fail "$file:$number action \"$ref\" lacks its \"# <tag>\" comment"
  done < <(grep -nE '^\s*(-\s+)?uses:' .github/workflows/*.yml | sed -E 's/^([^:]+):([0-9]+):/\1:\2:/')
fi

exit "$failed"
