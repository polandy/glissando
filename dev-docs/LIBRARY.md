# LIBRARY.md — Import and storage on the device

Pictures and music are imported into the browser's storage on the device; nothing leaves it
unless the user exports a slideshow as a file. Code: `src/import/` (reading files),
`src/library/` (storing them), `src/glissando-file/` (the `.glissando` file). Storage choice:
ADR-0003; file container: ADR-0004.

## Importing pictures

- **Accepted**: any file the browser reports as `image/*`, picked as files or as a folder.
  Other files are skipped as _unsupported_ and are not counted. A picture the browser cannot
  decode (e.g. HEIC outside Safari) or can no longer read (`NotReadableError`, e.g. when Android
  Chrome lets the picker's permission lapse before the file's turn comes) is skipped as
  _unreadable_. The adapters that read a file's bytes map both to `UnreadablePictureError`.
- **Downscaled** to fit 3840 px on the long edge and 2160 px on the short edge (about 4K, either
  orientation), never upscaled, turned upright by its EXIF orientation and stored as JPEG
  (quality 0.9). A thumbnail fits 480 px on the long edge (JPEG, quality 0.8).
- **Capture date**: EXIF `DateTimeOriginal` from the first 128 KB of a JPEG, else the file's
  modification time. EXIF has no time zone, so every capture date is the _wall-clock time_ written
  with a `Z` suffix (`2025-07-01T10:30:15Z`); the file-date fallback uses the device's local
  time the same way. Ordering and titles follow the clock the user saw, not a true UTC instant.
- **Order**: by capture date ascending, equal dates by file name.
- **From Immich** (ADR-0013): the original is downloaded and goes through the same decode; one
  the browser cannot decode falls back to Immich's preview (JPEG, ≤ 1440 px). The capture date is
  Immich's `localDateTime` (wall time with `Z`, as above). A photo whose download fails (Immich or
  the server gone meanwhile) is skipped as _not downloaded_; the import goes on. Files and Immich
  photos are two `PictureSource` adapters of the one `PictureImport`.
- **Origin** (ADR-0016): a picture keeps `immichAssetId` (from Immich) or `fileBytes` (a file's
  size). **Duplicates**: before a picture is read, its identity (`PictureSource.identify()`: file
  name, capture date and origin; a file reads only its EXIF for it) is compared by `isSamePicture`
  with the pictures it is added to and those this import took in. A match with the former is
  skipped as _alreadyIn_, one with the latter as _chosenTwice_; both are kept, so
  `addDuplicates(reason)` can take those of one reason in after all.
- **Adding to a slideshow**: the same import, given the slideshow's pictures as the known ones;
  `addPictures` puts the stored ones into the record (by capture date, or at the end with
  `ownOrder`; an id already in it is skipped) in one `updateSlideshowWith`, which reads and
  writes the record in one transaction, and the import's claim is released after it. Once the
  record is stored, a release that fails is reported and the adding still succeeds.

## Step 1 — the picture import

`PictureImport` processes the picked files one at a time (memory stays bounded on phones) and
publishes a state with the Svelte store contract:

- `total` counts accepted picture files, `done` the processed ones (stored or unreadable), so
  progress "done of total" reaches total. More files can be added at any time; they append.
- `pictures` lists the stored pictures in capture-date order as they arrive.
- **Storage full** (`QuotaExceededError`): the import stops, keeps what is stored, drops the
  remaining files from `total` and reports `storageFull`. Adding files again tries again.
- `skipped` names each skipped file with its reason (_unsupported_, _unreadable_, _not
  downloaded_, _alreadyIn_, _chosenTwice_); a duplicate counts as done.
- **Cancel** stops after the file in flight and clears the state.
- Any other error ends the import as `failed`; it is never swallowed: `settled()` rejects with
  `PictureImportFailedError` (the error as its `cause`), which the app logs and shows as the
  failed state only. The error of a file cancelled in flight fails nothing and rejects as itself,
  so the app reports it. A failed import takes no more files until it is cancelled, which starts
  it over.

## Music

One file the browser plays natively. Its duration is read from the file's metadata; a file the
browser cannot load, or one without a finite duration (a live stream), is rejected as
unreadable.

The music editor sets an excerpt and fades on the stored music (ADR-0009); the file itself is
never changed. `StoredMusic.trim` (`{ startMs, endMs }`, whole ms, `0 ≤ startMs`,
`endMs ≤ durationMs`, at least `MIN_MUSIC_EXCERPT_MS` = 5000 long) is the part that plays;
absent, the whole track. `fadeInMs` and `fadeOutMs` are own fades in whole ms, 0 to 10000 in
steps of 500, 0 being off (the editor offers off, 2000 and 5000); absent, automatic.
`setMusicTrim` deletes the field for `undefined` or the whole track, `setMusicFadeIn` and
`setMusicFadeOut` for `undefined`; all three validate (`checkMusicTrim`, `checkMusicFadeMs`).
Records without them need no migration.

## Storage layout

One IndexedDB database, `glissando` (schema version 3; version 1 lacked `imports`, version 2
`focus` — each upgrade only adds its store, existing data stays as it is):

| Object store | Key      | Value                                                                    |
| ------------ | -------- | ------------------------------------------------------------------------ |
| `slideshows` | `id`     | the slideshow record (`StoredSlideshow`)                                 |
| `pictures`   | media id | display and thumbnail rendition, bytes + type                            |
| `music`      | media id | the music file, bytes + type                                             |
| `imports`    | `id`     | a claim (import in progress or undoable removal): `startedAt`, media ids |
| `focus`      | media id | a picture's `PictureFocus`: its subject box, or none found (ADR-0012)    |

Media is written while importing, the slideshow record last. Edits on the slideshow screen
replace the record through `updateSlideshow`, which reads it in the same transaction and throws
`SlideshowNotFoundError` when it is gone (`updateSlideshowWith(id, edit)` does the same with a pure
edit of the record as stored), so an edit (or an Undo) from a tab still showing a
slideshow deleted elsewhere never brings it back; that tab goes back to start with the toast
"This slideshow no longer exists." `ownOrder` marks pictures the user reordered. A picture's
optional `kenBurns` (`{ from, to }`, two framings as in the player's JSON: zoom 1 to
`MAX_OWN_KEN_BURNS_ZOOM` = 3, centre 0..1) is its own motion from the picture editor; absent, the
motion is automatic (ADR-0006). `setPictureKenBurns` validates it before it is stored
(`checkOwnKenBurns`, failing loud with the field and value); records without it need no
migration. A picture's optional `caption` is the one line shown with it in the player, stored
as `normalizeCaption` leaves the typed text (`setPictureCaption`: whitespace runs become one
space, trimmed, at most 80 characters counted in graphemes; nothing left deletes the field). A
picture's optional `durationMs` is how long it shows (whole ms, 2000 to 15000 in steps of 500)
and its optional `transition` how it hands over to the next picture (one of
`TRANSITION_CHOICES`: the player's six effects or `"cut"`); absent, each is automatic and no
transition length is ever stored (ADR-0008). A picture's optional `immichAssetId` or `fileBytes`
(a positive whole number) is its origin (ADR-0016); records without them need no migration. `setPictureDuration` and `setPictureTransition`
validate them (`checkOwnDurationMs`, `checkTransitionChoice`) and delete the field for
`undefined`; records without them need no migration. The slideshow's optional `transition` is
the default every picture without its own plays (one of `SLIDESHOW_TRANSITIONS`: a picture's
choices or `"alternate"`); absent, it is the crossfade (ADR-0010). `setSlideshowTransition`
validates it (`checkSlideshowTransition`) and deletes the field for `undefined` or
`"crossfade"`; records without it need no migration. `mediaBytes`
measures what a slideshow's pictures (both renditions) and music take, in one read-only
transaction, for the export's size estimate. `deleteSlideshow` deletes the
record and, in the same transaction, the media no other slideshow references, those pictures'
focus with it.

A picture's focus lives beside its media, not on the record: the editors save whole records
from their copy, which would erase a focus found meanwhile. `putPictureFocus` checks for the
picture's media in the same transaction and keeps nothing without it, so a detection finishing
after its slideshow was deleted resurrects nothing; `pictureFocus(ids)` returns a map in which a
picture not looked at yet is absent.

## Looking for the focus

`FocusPass` (`library/focus-pass.ts`) looks, in the background, for the focus of every stored
picture without one (ADR-0012): newest slideshow first, one picture at a time, its thumbnail
through the `FocusDetector` (a worker) into the store. It starts when the app opens and again
whenever a slideshow is created (an import, an opened file); a start while it runs only takes up
the slideshows created since, so two never run at once. A picture from Immich with faces already
has its focus when it is stored: the largest of Immich's face boxes (by area; Immich gives no
score), divided by its `imageWidth`/`imageHeight` (Immich's preview in display orientation),
stored as `{kind: "subject"}`. An empty face list stores nothing — it may mean "not scanned yet" —
so the pass looks at that picture like any other. A picture whose media is gone meanwhile
is skipped; one whose detection fails is logged (`FocusDetectionFailedError`), keeps no focus and
is tried again on the next pass. A detection failing because the detector itself is gone
(`FocusDetectorGoneError`: its worker crashed, sent a reply that could not be read, or answered
`unavailable` as its face cascade did not load) ends the pass and is reported once; the pictures
left wait for the next pass. An unexpected store error ends the pass and is reported too. Its
state, with the Svelte store contract: `running`; per slideshow with pictures left, `done` of
`total` (those it had no focus for when taken up); `searching`, the pictures still to come; and
`found`, every focus it stored since the app opened. The slideshow screen merges `found` into
the focus it read on opening, so the editors' automatic motions and focus marks follow at once.

A write commits its transaction explicitly (`commit()`) as soon as its last request is placed —
right away for a plain write, in the read's callback for one that reads first. Chromium aborts a
transaction still open when the page unloads, so an edit followed at once by a reload would
otherwise be lost. Every edit starts its write synchronously in the event that made it.

A removal claims the removed picture's media in `imports` (below) before the record without it
is stored, and releases the claim once its undo toast is gone: undone (after the restoring save
is queued), expired, replaced by another toast, ended by a move, or the screen left. So a
clean-up in any tab spares that media while Undo can still bring the picture back; afterwards it
counts as unreferenced.

## Abandoned imports and claims

Media no saved slideshow references (a cancelled or interrupted import) is deleted by
`deleteUnreferencedMedia`, run at startup and after each import ends. An import claims every media
id in `imports` (`claimMedia`) before writing the media, and its claim is released
(`releaseClaim`) when the slideshow is created or the import discarded; until then the clean-up —
in any tab — spares its media. An undoable removal claims its media the same way (above). A record older
than one day (`CLAIM_SPARED_FOR_MS`, from a tab that crashed) is dropped and its media deleted.
The clean-up reads the references and claims and deletes in one transaction, a deleted
picture's focus included. Web Locks would
need a secure context, which the app over plain HTTP on the LAN lacks.

## The .glissando file

One slideshow as one file, to move it between devices (`src/glissando-file/`). A ZIP whose
entries are stored, not compressed, so any unzip tool opens it; no ZIP64, so it stays under
4 GiB and 65,535 entries (ADR-0004):

| Entry                  | Content                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `glissando.json`       | always first: `format` "glissando", `formatVersion` 7, the `slideshow` |
| `pictures/0001.jpg` …  | the display renditions in play order, as stored (numbered from 0001)   |
| `thumbnails/0001.jpg`… | their thumbnails, as stored                                            |
| `music/track.<ext>`    | the music, extension from its file name (none when it has none)        |

`slideshow` is the stored record without device ids: `title`, `createdAt`, `secondsPerPicture`,
`ownOrder` (only when true), `transition` (only when not the crossfade), `pictures` (`file`, `thumbnail`, `capturedAt`, `width`, `height`,
`fileName`, `kenBurns` for a picture with an own motion, `caption` for one with a caption,
`durationMs` and `transition` for one with an own duration or transition, `immichAssetId` or
`fileBytes` where known) and `music` (`file`, `fileName`, `durationMs` in whole ms, `mimeType`, and `trim`, `fadeInMs`, `fadeOutMs` where set). Picture types follow
the extension (`jpg`, `png`, `webp`). No picture's focus travels in the file: the receiving
device looks for it itself (ADR-0012). The manifest is read strictly: an unknown key or a value
out of range makes the file damaged. Version 2 added `kenBurns`, version 3 `caption`, version 4
`durationMs` and `transition`, version 5 the music's `trim`, `fadeInMs` and `fadeOutMs`,
version 6 the slideshow's `transition`, version 7 the pictures' `immichAssetId` or `fileBytes`
(a picture carrying both is damaged, the reason names its path);
files of versions 1 to 6 are still read (without
`transition`: the crossfade), and a file carrying a field its version does not know is
damaged. An own duration, transition, default transition, excerpt or fade is checked as on the edit; the reason
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

## Persistent storage

The app asks the browser not to evict its storage (`navigator.storage.persist()`). The answer is
_granted_, _refused_ or _unsupported_; a refusal is not an error — the app keeps working.
