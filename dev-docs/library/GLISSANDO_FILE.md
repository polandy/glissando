# The .glissando file

One slideshow as one file, to move it between devices (`src/glissando-file/`). A ZIP; the export
stores its entries, not compressed, in the order of the table, and any unzip tool opens it. No
ZIP64, so it stays under 4 GiB and 65,535 entries. Glissando also opens a copy a ZIP tool packed
again (`zip-reader.ts`, `entry-layout.ts`): entries stored or deflated (unpacked with
`DecompressionStream("deflate-raw")`), in any order. Every opened file is foreign and possibly
hostile (ADR-0038):

| Entry                   | Content                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `glissando.json`        | first, as the export writes it, indented: `format` "glissando", `formatVersion` 15, the `slideshow`                  |
| `glissando.schema.json` | next: a JSON Schema (draft-07) of `glissando.json` at the current `formatVersion`                                    |
| `README.txt`            | next: English plain text saying what the file is and what each entry holds                                           |
| `index.html`            | next: a player for the unpacked folder (`src/file-page/`, ADR-0038), see below                                       |
| `pictures/0001.jpg` …   | the display renditions in play order, as stored (numbered from 0001)                                                 |
| `thumbnails/0001.jpg`…  | their thumbnails, as stored                                                                                          |
| `music/track-<n>.<ext>` | the playlist's n-th song (from 1), extension from its file name (none when it has none)                              |
| `videos/clip-<n>.<ext>` | the n-th distinct clip a video slide plays (from 1, by first use), extension the type's subtype (`quicktime`: `mov`) |

`slideshow` is the stored record without device ids: `title`, `createdAt`, `secondsPerPicture`,
`pictureLength` (only when set), `ownOrder` (only when true), `transition` (only when not the crossfade), `portraitPictures` (only when set, ADR-0028), `openingCard` and `closingCard` (only when set, ADR-0032, [TITLE_SLIDES](../app/slideshow-editing/TITLE_SLIDES.md); a card picture is named by its index in `pictures`), `pictures` (`file`, `thumbnail`, `capturedAt`, `width`, `height`,
`fileName`, `colours` (`veil` and `accent`, ADR-0033), `kenBurns` for a picture with an own motion, `caption` for one with a caption,
`durationMs` and `transition` for one with an own duration or transition, `immichAssetId` or
`fileBytes` where known, `alone` for one never composed into a pair, `video` for a video slide: the clip's `file` and `mimeType`, its `sourceMs`, the excerpt `startMs` and `endMs`, and `volume` and `duckMusic: false` where set, ADR-0034; slides playing one clip name one file, which is stored once), `songs` (in play order, empty without music; each `file`, `fileName`, `durationMs` in whole ms, `mimeType`, and `trim`, `fadeInMs`, `fadeOutMs`, `pictureChanges`, `volumeDb` (whole dB off the levelled
default, -12 to 6, ADR-0040) and `sampleTrack` (the id of one of Glissando's sample tracks, lowercase
letters, digits and hyphens, which credits it as "Music: Glissando, CC BY-NC 4.0", ADR-0042) where set) and `betweenSongs` (only when set). Picture types follow
the extension (`jpg`, `png`, `webp`). No picture's focus travels in the file: the receiving
device looks for it itself (ADR-0012). The manifest is read strictly: an unknown key or a value
out of range makes the file damaged. Versions 13 to 16 are read (version 13 has no `video`; version 14 added it with the `videos/` entries, ADR-0034; version 15 added a song's own `volumeDb`, ADR-0040; version 16 a song's `sampleTrack`, ADR-0042); a file
of an older version is damaged. An own duration, transition, default transition, excerpt, fade or picture changes is checked as on the edit; the reason
names its path and value. A caption must be what `normalizeCaption` leaves (1 to 80 characters counted in graphemes, one line, no
leading, trailing or repeated whitespace); the reason names its path and value.

`glissando.schema.json` (`manifest-schema.ts` and its siblings) is built from the same constants
`readManifest` checks against, so the two cannot drift apart; `manifest-schema.test.ts` and its
siblings keep them in sync by running both over one table of manifests. A few rules it cannot
express stay reader-only, and are named in the schema's own `description` and proved by
`manifest-schema-reader-only.test.ts`: a repeated song path, a card background's `pictureIndex`
past the picture count, two clips sharing a file but not a `mimeType`, a date-time that matches
the pattern but not a real calendar time, a caption or card text over 80 graphemes (their
whitespace rule is in the schema), a music trim past its
track's `durationMs`, and a video excerpt under 500 ms.

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
