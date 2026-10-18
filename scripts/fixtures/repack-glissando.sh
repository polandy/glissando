#!/usr/bin/env bash
# Builds the .glissando file the app would export, then repacks it exactly as a handful of real
# ZIP tools would, into src/glissando-file/testing/repacked/ (ADR-0038: the reader accepts a file
# some other tool packed again). Needs Info-ZIP `zip`, `7z` and `python3` on PATH; pass a
# different `zip` binary with ZIP=/path/to/zip. Fixed timestamps on every source tree keep the
# output the same, or near enough, across runs.
#
#   ZIP=/path/to/zip scripts/fixtures/repack-glissando.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$ROOT/src/glissando-file/testing/repacked"
ZIP="${ZIP:-zip}"
FIXED_TIMESTAMP="2025-10-01 08:00:00Z"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$OUT_DIR"

# The export the app would write, unpacked once; every fixture below repacks a copy of this tree.
node "$ROOT/scripts/fixtures/write-exported-glissando.mjs" "$WORK/exported.glissando"
python3 -c "
import sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as archive:
    archive.extractall(sys.argv[2])
" "$WORK/exported.glissando" "$WORK/unpacked"
find "$WORK/unpacked" -exec touch -d "$FIXED_TIMESTAMP" {} +

# info-zip.glissando: Info-ZIP's defaults (deflate, directory entries), filesystem order made
# deterministic by sorting the names fed to it.
(
  cd "$WORK/unpacked"
  find . -mindepth 1 | sort | "$ZIP" -X -q -@ "$OUT_DIR/info-zip.glissando"
)

# no-thumbnails.glissando: the same, but the whole thumbnails/ folder was deleted first.
cp -r "$WORK/unpacked" "$WORK/unpacked-no-thumbnails"
rm -rf "$WORK/unpacked-no-thumbnails/thumbnails"
find "$WORK/unpacked-no-thumbnails" -exec touch -d "$FIXED_TIMESTAMP" {} +
(
  cd "$WORK/unpacked-no-thumbnails"
  find . -mindepth 1 | sort | "$ZIP" -X -q -@ "$OUT_DIR/no-thumbnails.glissando"
)

# python-zipfile.glissando: Python's zipfile, every entry deflated, added in reverse name order
# so glissando.json lands last, with a fixed date_time instead of the file's mtime.
python3 - "$WORK/unpacked" "$OUT_DIR/python-zipfile.glissando" <<'PYTHON'
import os
import sys
import zipfile

src_dir, out_path = sys.argv[1], sys.argv[2]
FIXED_DATE_TIME = (2025, 10, 1, 8, 0, 0)

names = []
for dirpath, _dirnames, filenames in os.walk(src_dir):
    for filename in filenames:
        full = os.path.join(dirpath, filename)
        names.append(os.path.relpath(full, src_dir).replace(os.sep, "/"))
names.sort(reverse=True)

with zipfile.ZipFile(out_path, "w") as archive:
    for name in names:
        with open(os.path.join(src_dir, name), "rb") as handle:
            data = handle.read()
        info = zipfile.ZipInfo(name, date_time=FIXED_DATE_TIME)
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, data)
PYTHON

# macos-finder.glissando: macOS Finder's "Compress" of a folder named "Herbst in Wien" — every
# entry under that prefix, a .DS_Store, a sibling __MACOSX/ AppleDouble file, and (what Finder's
# zip writes and this reader must accept) data descriptors instead of sizes in the local headers.
# zipfile only writes those when its target stream cannot seek, so it is handed a write-only one.
MACOS_SRC="$WORK/macos-src"
mkdir -p "$MACOS_SRC/Herbst in Wien" "$MACOS_SRC/__MACOSX/Herbst in Wien"
cp -r "$WORK/unpacked/." "$MACOS_SRC/Herbst in Wien/"
printf 'DS_Store placeholder bytes, not real Finder metadata.\n' >"$MACOS_SRC/Herbst in Wien/.DS_Store"
printf 'AppleDouble placeholder bytes, not a real resource fork.\n' \
  >"$MACOS_SRC/__MACOSX/Herbst in Wien/._glissando.json"
find "$MACOS_SRC" -exec touch -d "$FIXED_TIMESTAMP" {} +
python3 - "$MACOS_SRC" "$OUT_DIR/macos-finder.glissando" <<'PYTHON'
import os
import sys
import zipfile

src_dir, out_path = sys.argv[1], sys.argv[2]
FIXED_DATE_TIME = (2025, 10, 1, 8, 0, 0)


class NonSeekableWriter:
    """A write-only stream; zipfile falls back to data descriptors when `tell` is unavailable."""

    def __init__(self):
        self._chunks = []

    def write(self, data):
        self._chunks.append(bytes(data))
        return len(data)

    def flush(self):
        pass

    def close(self):
        pass

    def getvalue(self):
        return b"".join(self._chunks)


def entries(root):
    """(archive name, source path, or None for a directory), directories before their files."""
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        filenames.sort()
        rel = os.path.relpath(dirpath, root)
        if rel != ".":
            yield rel.replace(os.sep, "/") + "/", None
        for filename in filenames:
            name = filename if rel == "." else f"{rel}/{filename}"
            yield name.replace(os.sep, "/"), os.path.join(dirpath, filename)


stream = NonSeekableWriter()
with zipfile.ZipFile(stream, "w") as archive:
    for name, source in entries(src_dir):
        info = zipfile.ZipInfo(name, date_time=FIXED_DATE_TIME)
        if source is None:
            info.compress_type = zipfile.ZIP_STORED
            archive.writestr(info, b"")
            continue
        info.compress_type = zipfile.ZIP_DEFLATED
        with open(source, "rb") as handle:
            archive.writestr(info, handle.read())

with open(out_path, "wb") as handle:
    handle.write(stream.getvalue())
PYTHON

# windows-explorer.glissando: Windows "Send to -> Compressed (zipped) folder" of a folder named
# "Herbst in Wien" that also holds a Thumbs.db and a pictures/desktop.ini.
WINDOWS_SRC="$WORK/windows-src"
mkdir -p "$WINDOWS_SRC/Herbst in Wien"
cp -r "$WORK/unpacked/." "$WINDOWS_SRC/Herbst in Wien/"
printf 'Thumbs.db placeholder bytes, not real thumbnail cache data.\n' \
  >"$WINDOWS_SRC/Herbst in Wien/Thumbs.db"
printf '[.ShellClassInfo]\r\nplaceholder desktop.ini bytes\r\n' \
  >"$WINDOWS_SRC/Herbst in Wien/pictures/desktop.ini"
find "$WINDOWS_SRC" -exec touch -d "$FIXED_TIMESTAMP" {} +
(
  cd "$WINDOWS_SRC"
  7z a -tzip -mx=5 "$OUT_DIR/windows-explorer.glissando" "Herbst in Wien" >/dev/null
)

echo "wrote fixtures to $OUT_DIR"
