# The .glissando file: export, check and write

The manifest's shape: [GLISSANDO_FILE](GLISSANDO_FILE.md). This covers the ZIP container's own
read and write path.

- **Export** (`exportSlideshow`) reads the media from the store one file at a time and builds
  the container from their blobs; the file is named after the title, characters a file system
  refuses replaced by "-".
- **Check first, then write** (`checkGlissandoFile`): before anything is stored the file must
  start like a ZIP (else _foreign_), have a readable ZIP directory whose entries match their local
  headers, with no name twice (else _damaged_), and hold `glissando.json` (else _foreign_). Entries
  a ZIP tool adds by itself are skipped unread: an empty directory entry (`pictures/`), anything
  under `__MACOSX/`, a `._` file, `.DS_Store`, `Thumbs.db` and `desktop.ini` (by name, any case),
  never one whose name leaves its folder. When `glissando.json` is not at the top but in exactly one
  top-level folder (zipping the folder itself, as Finder's "Compress" or Windows' "Compressed
  folder" do), that folder is taken off every name; an entry outside it refuses the file (_damaged_), as it could stand in for one inside. Then a
  manifest of this format (else
  _foreign_) and no higher version (else _newer_) that validates (else _damaged_), every media
  file it names present, and fit into the free storage (`navigator.storage.estimate()`, quota
  minus usage; else _too large_, skipped where the browser cannot tell, e.g. over plain HTTP).
  Before the manifest is read, every entry name must be `glissando.json`, `glissando.schema.json`,
  `README.txt`, `index.html` or match its kind's pattern in the table, and each media path the
  manifest names that of its own kind (no `../`, no absolute path, no directory entry); the
  manifest may hold 8 MiB, a picture 64 MiB, a thumbnail 4 MiB, a clip 1 GiB and all entries
  together under 4 GiB (else _damaged_), each by the unpacked size the ZIP directory declares; a
  skipped entry counts in the total too. `README.txt`, `index.html` and the schema are never read.
  Last, one media file at a time: unpacked when deflated, stopping as soon as it passes its
  declared size (a ZIP bomb), and refused with any other method (named), encrypted, or short of
  its declared size; its CRC-32 over the unpacked bytes; for a picture or thumbnail its size from its header
  (JPEG, PNG, WebP), which must fit the display or thumbnail bound and, for a picture, equal its
  `width` and `height`, before it is decoded; then it is decoded (a picture to its header size, a
  song by Web Audio at the beat-detection rate, a clip's metadata loaded). Any failure is
  _damaged_ and names the entry: one damaged picture refuses the whole file. A thumbnail the
  manifest names but the file lacks is made again from its picture once that passed, as an import
  makes one (JPEG, `THUMBNAIL_BOUND`), and counts in the media bytes. An edited manifest may leave
  a picture's `thumbnail` key out: the thumbnail is made the same way, at `thumbnails/<n>.jpg`
  from the picture's own number on, the first such path no entry of the file and no other picture
  holds, so it never takes up a stray entry's bytes. Each stored media file, a
  clip too, is read as a slice of the file, never all at once; a deflated one is unpacked into
  memory one file at a time, during the check and again when it is written. A clip counts in
  the media bytes that must fit, once however many slides play it; two slides naming one clip file with two types make the file damaged.
- **Write** (`writeGlissandoFile`): always a new slideshow with fresh ids, created now, keeping
  every setting the file carries (picture length, portrait pictures, each picture's `alone` mark); a title
  the library already has gets the first free " (2)", " (3)" …. All or nothing: it claims each
  media id in `imports` before writing that media (each clip once, shared by the slides that play it) and saves the record last. Cancelled, or
  failing midway (e.g. `QuotaExceededError`), it releases its claim and deletes the unreferenced
  media, so no half slideshow stays behind.

## `index.html`

`build/file-page-plugin.ts` builds `src/file-page/main.ts` into the virtual module
`virtual:glissando-file-page` (script, style, caption font, every card font, both languages'
words); at export, `filePageHtml` bakes in the slideshow's title and only the card fonts its
shown title and closing slides use. Opened, the page reads `glissando.json` beside it with
`fetch` (Firefox from `file://`, any browser over HTTP); where that throws (Chromium and WebKit
from `file://`), it shows a card with a folder picker, and the shallowest `glissando.json` among
the picked files marks the folder. Either way the manifest is checked with `readManifest`, and
every picture, song and clip it names must be in the folder (thumbnails need not); a problem is
said in words on the card. The slideshow is composed as the app composes it, without focus or
beats, and plays on the normal renderer, each medium read as a `Blob`. German where the
browser's language is, English otherwise.
