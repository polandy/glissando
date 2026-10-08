# LIBRARY.md — Import and storage on the device

Pictures and music are imported into the browser's storage on the device; nothing leaves it.
Code: `src/import/` (reading files), `src/library/` (storing them). Storage choice: ADR-0003.

## Importing pictures

- **Accepted**: any file the browser reports as `image/*`, picked as files or as a folder.
  Other files are skipped as _unsupported_ and are not counted. A picture the browser cannot
  decode (e.g. HEIC outside Safari) is skipped as _unreadable_.
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
- Any other error ends the import as `failed`; it is never swallowed.

## Music

One file the browser plays natively. Its duration is read from the file's metadata; a file the
browser cannot load, or one without a finite duration (a live stream), is rejected as
unreadable.

## Storage layout

One IndexedDB database, `glissando` (schema version 1):

| Object store | Key      | Value                                         |
| ------------ | -------- | --------------------------------------------- |
| `slideshows` | `id`     | the slideshow record (`StoredSlideshow`)      |
| `pictures`   | media id | display and thumbnail rendition, bytes + type |
| `music`      | media id | the music file, bytes + type                  |

Media is written while importing, the slideshow record last.

## Abandoned imports

Media no saved slideshow references (a cancelled or interrupted import) is deleted by
`deleteUnreferencedMedia`, which spares the ids of an import still in progress. It reads the
references and deletes in one transaction.

## Persistent storage

The app asks the browser not to evict its storage (`navigator.storage.persist()`). The answer is
_granted_, _refused_ or _unsupported_; a refusal is not an error — the app keeps working, and the
install hint is offered again, since installed apps are granted it more readily.
