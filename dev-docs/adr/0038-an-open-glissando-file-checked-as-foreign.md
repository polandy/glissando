# ADR-0038: The .glissando file is open, and every opened file is checked as foreign

**Status:** accepted; supersedes ADR-0004

## Context

A `.glissando` file moves one slideshow between devices (`dev-docs/library/GLISSANDO_FILE.md`).
ADR-0004 kept it a minimal ZIP: every entry stored, `glissando.json` first, read only in exactly
that shape. Such a file opens in any unzip tool, but it says nothing to someone without Glissando,
and a copy that a ZIP tool packed again (compressed, in another order) is refused as damaged.

The file should be useful without Glissando and as open as possible: readable data, a description
of the format, a way to watch the slideshow. No `.glissando` file anyone depends on exists yet, so
the format may break: a new version is refused by older apps and older files by this one, with no
migration (as for the library, see `dev-docs/SCOPE.md`).

A file comes from anywhere: a mail, a messenger, a download. Glissando runs on the device, so
anything it could use to sign a file ships with the app and is public.

## Decision

- **Still a ZIP named `.glissando`.** Whoever wants to look inside renames it to `.zip`. It holds
  `glissando.json` (indented, readable), `glissando.schema.json` (a JSON Schema of it), the
  `pictures/`, `thumbnails/`, `music/` and `videos/` entries, an English `README.txt` (what each
  entry is; unpack the whole file first, then open `index.html`) and `index.html`: the player
  engine as its own bundle, which reads `glissando.json` and the pictures beside it.
- **`index.html` plays on the DOM renderer.** From `file://`, Chromium and WebKit refuse a picture
  beside the page to WebGL (ADR-0017); the page is a way in for anyone without Glissando, not the
  share format — that stays the web page export (ADR-0017) and the video (ADR-0015).
- **Glissando opens a file that was edited and packed again**: entries stored or deflated (read
  with `DecompressionStream("deflate-raw")`, no dependency), in any order, `glissando.json`
  anywhere among them; a missing thumbnail is made again from its picture, and so is one whose
  picture's `thumbnail` key was left out — under a free `thumbnails/` path of the format. The entries ZIP tools
  add by themselves — empty directory entries, `__MACOSX/`, `._` files, `.DS_Store`, `Thumbs.db`,
  `desktop.ini` — are skipped unread, and one top-level folder holding `glissando.json`, as
  zipping the folder itself adds it, is taken off every name; an entry beside that folder refuses the file. Any other unknown entry still
  refuses the file.
- **No signature.** A key inside an app that runs on the device is public, so a signature would
  prove only that someone had the app. Instead every file is foreign and possibly hostile, and
  is checked whole before anything of it is stored, all or nothing:
  - `glissando.json` against the format's schema: an unknown key, a wrong type or a value out of
    range refuses the file;
  - limits on the entries' count, the file's size and each entry's and all entries' unpacked size
    (ZIP bombs); unpacking stops at an entry's declared size;
  - every entry name matches the format's pattern (no `../`, no absolute path, nothing else but
    the fixed list of tool entries above, which is never read);
  - every picture's dimensions are read from its header and bounded before it is decoded, so a
    picture that would take gigabytes to decode is refused unread;
  - every picture, thumbnail, song and clip is decoded (or, a clip, loaded) before it is stored,
    not only checksummed: a file that is not what its name says is refused;
  - text from a file is shown as text only, never as HTML (enforced by lint);
  - `README.txt`, `index.html` and the schema are skipped on opening, never read or run.

## Options weighed

- _Keep the minimal stored ZIP (ADR-0004)_ — the smallest reader, but closed to anyone without
  Glissando and to any tool that packs the file again.
- _A signed file_ — rejected: with the key on every device, it protects nothing and suggests
  safety it cannot give.
- _A self-contained `index.html` with the media inside (ADR-0017)_ — WebGL would work, but every
  picture would sit in the file twice, once as base64; the web page export exists for that.
- _Skip every unknown entry unread_ — the most forgiving, but a mistyped media name would show
  only as "missing", and the format would hold whatever anyone adds; rejected for the fixed list.
- _Refuse a folder around the entries_ — simpler, but a folder zipped as a whole, the way Finder
  and Explorer offer first, would be refused with a reason few would understand.
- _An open ZIP, checked as foreign_ — chosen. The cost: a larger reader (deflate, any order,
  limits, header parsing), a second player bundle in every file (about 40 KB), and opening is
  slower, as every medium is decoded once more on the receiving device.

## Consequences

- An older `.glissando` file is refused as damaged; `formatVersion` counts up with each change.
- Opening decodes every picture once and every song at the beat-detection rate (ADR-0021), one
  file at a time; a long slideshow takes noticeably longer to check than to checksum.
- The limits bound what one file may hold; a slideshow beyond them cannot be exported either.
- `index.html` from `file://` plays only where the DOM renderer is good enough; Firefox, which
  allows WebGL there, is no special case.
