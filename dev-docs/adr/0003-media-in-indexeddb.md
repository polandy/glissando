# ADR-0003: Slideshows and their media live in IndexedDB

**Status:** accepted

## Context

The MVP stores imported pictures (downscaled, about 4K) and one music file per slideshow on the
device, so a slideshow survives a reload and plays offline (`dev-docs/SCOPE.md`). Browsers offer
two places for that much binary data: IndexedDB and the Origin Private File System (OPFS). The
slideshow record and its media must stay consistent: no record pointing at missing media, and
abandoned media found and removed.

## Decision

One IndexedDB database, `glissando`, holds the slideshow records and the media, in separate
object stores (`slideshows`, `pictures` with display and thumbnail rendition, `music`, and
`imports` for imports in progress). Media is written while importing, each id claimed in `imports`
first, the record last; cleaning up abandoned media reads the references and imports and deletes
in one transaction. Media is stored as bytes plus MIME type, not as `Blob`s.

## Options weighed

- _OPFS for media, IndexedDB for records_ — faster for large files and streamable; rejected
  because writable streams arrived late in Safari, and a record in one storage with its media in
  another needs its own atomicity story (orphans and dangling references after a crash).
- _IndexedDB with `Blob` values_ — browsers keep them file-backed; rejected because WebKit
  refuses `Blob`s in IndexedDB in ephemeral sessions (private browsing, and the automated
  browsers the tests run in).

## Consequences

- Records and media share transactions; a clean-up cannot race a save. An import still running
  in another tab, or a removal still undoable there, is visible to the clean-up only through
  its claim in `imports`, so a tab that
  crashed leaves a record behind; it is trusted for one day (see `dev-docs/LIBRARY.md`).
- Each write holds one rendition's bytes in memory once; the import writes one picture at a
  time, so memory stays bounded.
- Exporting and video rendering read media whole, not streamed; fine at display resolution.
