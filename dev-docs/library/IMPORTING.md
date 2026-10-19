# Importing pictures

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
- A video is taken in like a picture and is exempt from culling (`PICTURE_IMPORT.md`).
- **Culling** (ADR-0024): `PictureImport` hands each picture it stores, with its thumbnail, to
  `PictureCulling` (`src/app/import/picture-culling.ts`), which has it measured in a worker
  (`src/culling/`): the grey 480 px thumbnail's _sharpness_ (variance of the 4-neighbour
  Laplacian) and a 64-bit _difference hash_ (9 × 8 cell means, one bit per horizontal pair).
  Once every picture handed over is measured and the import is idle, `cull` runs over the
  import's measured pictures: in capture order a picture joins a **similar group** when it was
  taken at most 2 minutes after the group's first picture (`SIMILAR_SHOTS_WINDOW_MS`) and its hash
  is at most 10 bits from that first picture's (`SAME_SCENE_MAX_HASH_DISTANCE`) — the nearest such
  group, the later-started on a tie, else it starts one; a group's
  sharpest picture is kept (ties to the earliest) and the others are set aside as _similar_. A
  picture is _blurry_ below a sharpness of 50 (`BLURRY_SHARPNESS_FLOOR`) and below a third of the
  import's median (`BLURRY_SHARE_OF_MEDIAN`), so a set shot all soft is not emptied; a similar
  group's kept picture is never blurry, and the median picture is never below a third of itself, so some
  picture always stays. The constants are calibrated on generated scenes in every engine
  (`check-worker.browser.test.ts`). A set-aside picture leaves the import's pictures
  (`remove`) and is kept by `PictureCulling`; taking it in `restore`s it and exempts it from
  every later cull, as are duplicates taken in by `addDuplicates` and pictures the user moved in
  the pictures step (`exempt`, IMPORT_ARRANGING.md). A later cull, after more
  pictures, runs over the set-aside ones again. A picture the worker cannot measure stays in and
  its error is logged. Nothing about the check is stored: the slideshow holds what was kept, and
  the set-aside media, claimed like the rest, is deleted by the clean-up once the claim ends.
- **Adding to a slideshow**: the same import, given the slideshow's pictures as the known ones;
  `addPictures` puts the stored ones into the record (by capture date; with `ownOrder` as the
  user chose, sorted in by capture date or at the end; an id already in it is skipped) in one `updateSlideshowWith`, which reads and
  writes the record in one transaction, and the import's claim is released after it. Once the
  record is stored, a release that fails is reported and the adding still succeeds.
