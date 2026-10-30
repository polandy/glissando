#!/usr/bin/env bash
# Rebuilds public/places/cities15000.tsv from the GeoNames "cities15000" dump (ADR-0043). The
# output is committed, generated, never hand-edited, like the brand assets.
set -euo pipefail
cd "$(dirname "$0")"

SOURCE_URL="https://download.geonames.org/export/dump/cities15000.zip"
# GeoNames regenerates this dump daily, so the hash pins the exact bytes the committed output was
# built from; a changed dump must be reviewed and this hash updated deliberately, never silently.
EXPECTED_SHA256="306220b96c4dc00fd3bd7b2427290afed492a05ad5111d071644d74c79eba707"
OUTPUT_FILE="../../public/places/cities15000.tsv"

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

archive="$workdir/cities15000.zip"
curl --fail --silent --show-error --location --output "$archive" "$SOURCE_URL"

actual_sha256="$(sha256sum "$archive" | cut -d' ' -f1)"
if [[ "$actual_sha256" != "$EXPECTED_SHA256" ]]; then
  echo "FAIL cities15000.zip's sha256 is $actual_sha256, expected $EXPECTED_SHA256." >&2
  echo "GeoNames regenerates this dump daily, so this can be a legitimate new dump, not tampering." >&2
  echo "Review the new dump's content at $SOURCE_URL, then update EXPECTED_SHA256 in" >&2
  echo "$(basename "$0") to $actual_sha256 and re-run deliberately." >&2
  exit 1
fi

unzip -o -q "$archive" cities15000.txt -d "$workdir"
node build.mjs "$workdir/cities15000.txt" "$OUTPUT_FILE"
echo "wrote $OUTPUT_FILE"
