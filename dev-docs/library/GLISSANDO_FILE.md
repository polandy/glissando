# The .glissando file

One slideshow as one file, to move it between devices (`src/glissando-file/`). A ZIP whose
entries are stored, not compressed, so any unzip tool opens it; no ZIP64, so it stays under
4 GiB and 65,535 entries (ADR-0004):

| Entry                   | Content                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `glissando.json`        | always first: `format` "glissando", `formatVersion` 13, the `slideshow`                 |
| `pictures/0001.jpg` …   | the display renditions in play order, as stored (numbered from 0001)                    |
| `thumbnails/0001.jpg`…  | their thumbnails, as stored                                                             |
| `music/track-<n>.<ext>` | the playlist's n-th song (from 1), extension from its file name (none when it has none) |

`slideshow` is the stored record without device ids: `title`, `createdAt`, `secondsPerPicture`,
`pictureLength` (only when set), `ownOrder` (only when true), `transition` (only when not the crossfade), `portraitPictures` (only when set, ADR-0028), `openingCard` and `closingCard` (only when set, ADR-0032, [TITLE_SLIDES](../app/slideshow-editing/TITLE_SLIDES.md); a card picture is named by its index in `pictures`), `pictures` (`file`, `thumbnail`, `capturedAt`, `width`, `height`,
`fileName`, `colours` (`veil` and `accent`, ADR-0033), `kenBurns` for a picture with an own motion, `caption` for one with a caption,
`durationMs` and `transition` for one with an own duration or transition, `immichAssetId` or
`fileBytes` where known, `alone` for one never composed into a pair), `songs` (in play order, empty without music; each `file`, `fileName`, `durationMs` in whole ms, `mimeType`, and `trim`, `fadeInMs`, `fadeOutMs`, `pictureChanges` where set) and `betweenSongs` (only when set). Picture types follow
the extension (`jpg`, `png`, `webp`). No picture's focus travels in the file: the receiving
device looks for it itself (ADR-0012). The manifest is read strictly: an unknown key or a value
out of range makes the file damaged. Only version 13, the picture colours' (ADR-0033), is read; a file
of an older version is damaged. An own duration, transition, default transition, excerpt, fade or picture changes is checked as on the edit; the reason
names its path and value. A caption must be what `normalizeCaption` leaves (1 to 80 characters counted in graphemes, one line, no
leading, trailing or repeated whitespace); the reason names its path and value.

- **Export** (`exportSlideshow`) reads the media from the store one file at a time and builds
  the container from their blobs; the file is named after the title, characters a file system
  refuses replaced by "-".
- **Check first, then write** (`checkGlissandoFile`): before anything is stored the file must
  start with `glissando.json` (else _foreign_), have a readable ZIP directory whose entries match
  their local headers and are stored (else _damaged_), a manifest of this format (else
  _foreign_) and no higher version (else _newer_) that validates (else _damaged_), every media
  file it names present, and fit into the free storage (`navigator.storage.estimate()`, quota
  minus usage; else _too large_, skipped where the browser cannot tell, e.g. over plain HTTP).
  Last, every media file's CRC-32 is checked (else _damaged_): one damaged picture refuses the
  whole file. Each media file is read as a slice of the file, never all at once.
- **Write** (`writeGlissandoFile`): always a new slideshow with fresh ids, created now; a title
  the library already has gets the first free " (2)", " (3)" …. All or nothing: it claims each
  media id in `imports` before writing that media and saves the record last. Cancelled, or
  failing midway (e.g. `QuotaExceededError`), it releases its claim and deletes the unreferenced
  media, so no half slideshow stays behind.
