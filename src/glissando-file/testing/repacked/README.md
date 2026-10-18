# Repacked `.glissando` fixtures

Binary test fixtures for the reader that accepts a `.glissando` file some other ZIP tool packed
again (ADR-0038). Each one starts from the same export (`exportedFile()` in
`../glissando-fixtures.ts`), unpacked and packed again:

- `info-zip.glissando` — Info-ZIP `zip`'s own defaults: deflate, directory entries, names sorted.
- `python-zipfile.glissando` — Python's `zipfile`, every entry deflated, `glissando.json` added
  last instead of first.
- `macos-finder.glissando` — macOS Finder's "Compress", re-created with Python's `zipfile`: entries under `Herbst in Wien/`, a
  `.DS_Store`, a sibling `__MACOSX/` AppleDouble file, and data descriptors (general-purpose flag
  bit 3) in place of sizes in the local headers.
- `windows-explorer.glissando` — Windows "Send to → Compressed folder", re-created with `7z`: entries under
  `Herbst in Wien/`, plus its `Thumbs.db` and `pictures/desktop.ini`.
- `no-thumbnails.glissando` — an info-zip repack with the whole `thumbnails/` folder deleted
  first; `glissando.json` is unchanged.

Regenerate with `ZIP=/path/to/zip scripts/fixtures/repack-glissando.sh` (`zip`, `7z` and
`python3` must be on `PATH`, or pass `zip`'s path via `ZIP=`). Regenerate whenever the export
format changes.
