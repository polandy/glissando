# ADR-0054: Every .glissando file version opens, through a migration chain

**Status:** accepted

## Context

Until now, a version that changed the format refused every older file, as there was no
production instance. The reader took format versions 13 to 22 only, so an older demo file or an
early export the owner kept failed with "too old". The owner's rule is that Glissando versions
stay backward compatible unless the owner decides otherwise.

## Options

1. **Keep refusing old files.** No code for old versions, but every early export is lost.
2. **One reader per old version.** Each version read by its own code: complete, but the
   validation is copied 22 times and every new rule has to be added to each copy.
3. **One reader, plus a chain of steps for the versions whose shape changed.** The reader takes
   each field from the version that added it on (`*_FROM_VERSION`). A step rewrites a slideshow
   into the next changed version's shape before the reader sees it.

## Decision

Option 3. `manifest-migrations.ts` holds the chain; `readManifest` runs it on the raw slideshow
of a file of any version from `OLDEST_READABLE_FORMAT_VERSION` (1) on. Three steps exist:

- **to version 5**: the music's length is rounded up to whole milliseconds.
- **to version 10**: the single `music` becomes the playlist `songs` (one song, or none).
- **to version 13**: each picture gets the grey `colours` a picture without readable pixels gets,
  each card the entrance a card had before entrances (`rise`), and a picture background the
  default tint (`picture`).

A step refuses a key its target version introduced, so a file can't claim an older version while
holding newer fields. Each version has one fixture under
`src/glissando-file/testing/format-versions/`, and one test opens it as the app does.

## Consequences

- Any .glissando file Glissando ever wrote opens. A version 12 or older file's pictures carry
  grey colours, as their own were never stored; a card tinted by its picture shows grey.
- A new format version stays backward compatible: it adds a `*_FROM_VERSION` field or a step, a
  fixture and an open test. Raising `OLDEST_READABLE_FORMAT_VERSION` needs an owner decision.
- Music of a version 9 or older file sits at `music/track.<ext>`, which the entry-name check
  still allows.
