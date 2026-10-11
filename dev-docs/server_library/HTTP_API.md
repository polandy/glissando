# The HTTP API

Served by the Node service behind Caddy at `/api/library/` (same origin as the app). JSON in and
out unless noted; an error answers `{ "error": "<code>", "detail": "…" }`. Ids are UUIDs made by
the server.

| Request                                                          | Answer                                                                                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/library`                                               | 200 `{ "service": "glissando-library", "version": 1 }` — the discovery                                                                                                               |
| `GET /api/library/slideshows`                                    | 200 `{ "slideshows": [ { "id", "revision", "document" } ] }`, newest `createdAt` first                                                                                               |
| `GET /api/library/slideshows/{id}`                               | 200 `{ "id", "revision", "document" }`, `ETag: "<revision>"`; 404 `notFound`                                                                                                         |
| `POST /api/library/slideshows` body: a document                  | 201 `{ "id", "revision" }`; 400 `invalidDocument`; 409 `musicMissing`; 413 `tooLarge`; 415 `notJson`                                                                                 |
| `PUT /api/library/slideshows/{id}` `If-Match: "<rev>"`, document | 200 `{ "revision" }`; 412 `revisionChanged` with `{ "current": { "id", "revision", "document" } }`; 404; 428 `revisionRequired` without `If-Match`; 400, 409, 413, 415 as for `POST` |
| `DELETE /api/library/slideshows/{id}`                            | 204; 404                                                                                                                                                                             |
| `POST /api/library/music` body: the audio bytes, `Content-Type`  | 201 `{ "musicId" }`; 413 `tooLarge` over `MAX_MUSIC_BYTES` (200 MiB); 415 `notAudio` not `audio/*`                                                                                   |
| `GET /api/library/music/{musicId}`                               | 200 the bytes with their stored `Content-Type`; 404                                                                                                                                  |
| `GET /api/library/music/{musicId}/beats`                         | 200 `{ "beats": <MusicBeats> }` or `{ "beats": null }` while no device has listened yet; 404                                                                                         |
| `PUT /api/library/music/{musicId}/beats` body: a `MusicBeats`    | 204; 400 `invalidBeats`; 404; 413 `tooLarge`; 415 `notJson`                                                                                                                          |

- **Share links** add `…/slideshows/{id}/share` and the public `/api/share/` (`dev-docs/SHARE_LINK.md`).
- **Revision**: a positive whole number, 1 on create, +1 on every accepted `PUT`. Compared in the
  same transaction as the write. An `If-Match` other than the
  current `"<revision>"` (also `*` or a weak tag) is a stale one: 412.
- **Music**: a document naming, in any song, a `musicId` the server does not have is refused
  (409). Music no document references is deleted after `UNREFERENCED_MUSIC_GRACE_MS` (1 h, the
  service's injected clock, checked on every upload), its beats with it. The grace starts at the
  upload, and again when a `PUT` or `DELETE` drops the last reference (`uploaded_at` is set to
  that time), so undoing a song's removal can name the music again.
- **Beats** (`MusicBeats`, `src/beats/music-beats.ts`, ADR-0021): a device `PUT`s what it found so
  later devices read it instead of detecting again; a later `PUT` replaces the stored result
  (two devices may race, but the same detector gives the same answer).
- **Media type**: a `POST` or `PUT` of a slideshow carries `Content-Type: application/json`
  (parameters such as `charset` allowed), anything else answers 415 `notJson`. A cross-site page
  can make a browser send a form or `text/plain` request without asking, but not a JSON one, so
  this keeps another site from writing to the library.
- **Limits**: a document body up to 2 MiB (413 `tooLarge` above). Every other method or path under
  `/api/library/` answers 404 from the service; Caddy forwards only `/api/library` and
  `/api/library/*`.
