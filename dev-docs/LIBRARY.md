# LIBRARY.md — Import and storage on the device

Pictures and music are imported into the browser's storage on the device; nothing leaves it.
Code: `src/import/` (reading files), `src/library/` (storing them). Storage choice: ADR-0003.

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

## Step 1 — the picture import

`PictureImport` processes the picked files one at a time (memory stays bounded on phones) and
publishes a state with the Svelte store contract:

- `total` counts accepted picture files, `done` the processed ones (stored or unreadable), so
  progress "done of total" reaches total. More files can be added at any time; they append.
- `pictures` lists the stored pictures in capture-date order as they arrive.
- **Storage full** (`QuotaExceededError`): the import stops, keeps what is stored, drops the
  remaining files from `total` and reports `storageFull`. Adding files again tries again.
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

## Storage layout

One IndexedDB database, `glissando` (schema version 2; version 1 lacked `imports`):

| Object store | Key      | Value                                                                    |
| ------------ | -------- | ------------------------------------------------------------------------ |
| `slideshows` | `id`     | the slideshow record (`StoredSlideshow`)                                 |
| `pictures`   | media id | display and thumbnail rendition, bytes + type                            |
| `music`      | media id | the music file, bytes + type                                             |
| `imports`    | `id`     | a claim (import in progress or undoable removal): `startedAt`, media ids |

Media is written while importing, the slideshow record last. Edits on the slideshow screen
replace the record through `updateSlideshow`, which reads it in the same transaction and throws
`SlideshowNotFoundError` when it is gone, so an edit (or an Undo) from a tab still showing a
slideshow deleted elsewhere never brings it back; that tab goes back to start with the toast
"This slideshow no longer exists." `ownOrder` marks pictures the user reordered. `deleteSlideshow` deletes the
record and, in the same transaction, the media no other slideshow references.

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
The clean-up reads the references and claims and deletes in one transaction. Web Locks would
need a secure context, which the app over plain HTTP on the LAN lacks.

## Persistent storage

The app asks the browser not to evict its storage (`navigator.storage.persist()`). The answer is
_granted_, _refused_ or _unsupported_; a refusal is not an error — the app keeps working.
