# ADR-0004: The .glissando file is a stored ZIP, read and written by our own code

**Status:** accepted

## Context

A slideshow moves between devices as one `.glissando` file holding its pictures, thumbnails,
music and settings (`dev-docs/SCOPE.md`, `dev-docs/LIBRARY.md`). Pictures (JPEG) and music are
already compressed, so compressing them again gains nothing and costs time on phones. The file
should open in any unzip tool, so a user can look inside. A slideshow can reach hundreds of MB:
neither writing nor reading may hold the file twice in memory, and opening must check every
entry before anything is written.

## Decision

The container is a ZIP whose entries are all _stored_ (method 0, no compression), with UTF-8
names and the CRC-32 of each entry. `glissando.json` is its first entry, so the first local
header identifies the file. `src/glissando-file/stored-zip.ts` writes and reads exactly this
subset (under 300 lines with the CRC-32): the writer assembles the container from `Blob` parts
(the stored media are not copied again); the reader takes the central directory from the end of
the file and reads each entry as a `Blob` slice, checksummed in 8 MB chunks. No ZIP64: a file
stays under 4 GiB and 65,535 entries, and exporting a larger slideshow fails loudly
(`ZipTooLargeError`). At display resolution that is several thousand pictures.

## Options weighed

- _fflate_ — small and fast, but built around compressing: its unzip functions take the whole
  file as one `Uint8Array` (hundreds of MB in memory at once), and its streaming `Unzip` reads
  front to back, so checking first and writing second means two full passes through callbacks.
- _@zip.js/zip.js_ — complete (ZIP64, `Blob` readers, workers, streams); rejected as a large
  dependency for a format that uses no compression at all.
- _Our own reader and writer_ — chosen: the stored subset is small, fully tested against our own
  output and round-tripped through IndexedDB, needs no dependency (CODING_PRINCIPLES §5), and
  gives the reader the check-before-write shape directly. The cost: no ZIP64 and no reading of
  compressed or encrypted entries; a ZIP tool's re-zipped copy (compressed) is refused as
  damaged.

## Consequences

- Any unzip tool lists and extracts a `.glissando` file; a re-zipped or edited one is refused
  unless it is stored again with `glissando.json` first.
- A newer format version keeps the container and changes `formatVersion` in `glissando.json`;
  the reader refuses a higher version before reading anything else of it.
- Exporting holds the slideshow's media once, as the `Blob`s the store returns, until the
  download has them; opening holds one media file at a time.
- Lifting the 4 GiB limit means adding ZIP64 records to both sides of `stored-zip.ts`.
