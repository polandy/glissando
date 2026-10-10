# SERVER_LIBRARY.md — Slideshows on the Glissando server

Slideshows stored by the self-hosted Glissando, their pictures linked from Immich (ADR-0018).
The approved mockup: https://claude.ai/artifact/LMg64KXScDNzDHzuJTHx6B. Immich itself:
`dev-docs/APP.md`, Immich, and ADR-0013.

## The server document

A server slideshow is one JSON document (`src/server-library/server-document.ts`, shared by the
app and the server):

```json
{ "format": "glissando-server", "formatVersion": 1, "slideshow": { … } }
```

`slideshow` is the `.glissando` manifest's `slideshow` of format version 7 (`dev-docs/LIBRARY.md`,
The .glissando file) with two differences:

- every picture has `immichAssetId` (required) and neither `file`, `thumbnail` nor `fileBytes`;
- `music`, when present, has `musicId` (the server's id of the uploaded file) instead of `file`.

It is read as strictly as the manifest, with the same field checks (one implementation, shared
with `read-manifest.ts`): an unknown key, a value out of range, a missing `immichAssetId` or two
pictures with the same one make it invalid; the reason names the path and value. A picture's
`width` and `height` are Immich's (the asset's `width`/`height`) fitted into the display bound
(`fitWithin`, `DISPLAY_BOUND`); the rendition decoded at play time is authoritative for drawing.

In the app a server slideshow is a `StoredSlideshow` whose pictures' `id` is their
`immichAssetId` and whose music's `id` is its `musicId`.

## The HTTP API

Served by the Node service behind Caddy at `/api/library/` (same origin as the app). JSON in and
out unless noted; an error answers `{ "error": "<code>", "detail": "…" }`. Ids are UUIDs made by
the server.

| Request                                                          | Answer                                                                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/library`                                               | 200 `{ "service": "glissando-library", "version": 1 }` — the discovery                                                                             |
| `GET /api/library/slideshows`                                    | 200 `{ "slideshows": [ { "id", "revision", "document" } ] }`, newest `createdAt` first                                                             |
| `GET /api/library/slideshows/{id}`                               | 200 `{ "id", "revision", "document" }`, `ETag: "<revision>"`; 404 `notFound`                                                                       |
| `POST /api/library/slideshows` body: a document                  | 201 `{ "id", "revision" }`; 400 `invalidDocument`; 409 `musicMissing`                                                                              |
| `PUT /api/library/slideshows/{id}` `If-Match: "<rev>"`, document | 200 `{ "revision" }`; 412 `revisionChanged` with `{ "current": { "id", "revision", "document" } }`; 404; 428 `revisionRequired` without `If-Match` |
| `DELETE /api/library/slideshows/{id}`                            | 204; 404                                                                                                                                           |
| `POST /api/library/music` body: the audio bytes, `Content-Type`  | 201 `{ "musicId" }`; 413 `tooLarge` over `MAX_MUSIC_BYTES` (200 MiB); 415 `notAudio` not `audio/*`                                                 |
| `GET /api/library/music/{musicId}`                               | 200 the bytes with their stored `Content-Type`; 404                                                                                                |

- **Revision**: a positive whole number, 1 on create, +1 on every accepted `PUT`. Compared in the
  same transaction as the write. An `If-Match` other than the
  current `"<revision>"` (also `*` or a weak tag) is a stale one: 412.
- **Music**: a document naming a `musicId` the server does not have is refused (409). Music no
  document references any more is deleted in the transaction that dropped the last reference;
  music uploaded but never referenced is deleted after `UNREFERENCED_MUSIC_GRACE` (1 h, the
  service's injected clock, checked on every upload).
- **Limits**: a document body up to 2 MiB (413 `tooLarge` above). Every other method or path under
  `/api/library/` answers 404 from the service; Caddy forwards only `/api/library` and
  `/api/library/*`.

## The service

`server/` — TypeScript, bundled into one file at image build (`npm run build:server`, into
`dist-server/`), run by the image's Node. Node's types are declared for the parts used
(`server/node-modules.d.ts`), as `e2e/` does.

- **Config** (`server/config.ts`), parsed once at start: `GLISSANDO_DATA_DIR` (a writable
  directory; the database is `library.sqlite` in it) and the internal `GLISSANDO_LIBRARY_PORT`
  (loopback port, set by the entrypoint). Unknown `GLISSANDO_*`/`IMMICH_*` settings stop the
  start (the entrypoint already does this; `GLISSANDO_DATA_DIR` joins its known settings). The
  entrypoint hands the service these two settings only, never the Immich key.
- **Storage** (`node:sqlite`): tables `slideshows(id, revision, created_at, document)` and
  `music(id, content_type, bytes, uploaded_at)`, times in milliseconds since the epoch; WAL mode;
  every write in one transaction. Whether music is referenced is read from the documents
  (`json_extract`), so no second record of it can drift.
- **Ports**: a `LibraryRepository` (the SQLite adapter and an in-memory fake run the same contract
  suite), a clock and an id source, all injected into the request handler, which is a pure
  function of request → response tested in-process without sockets.
- **Request bodies** are read up to the path's limit (`maxBodyBytes`); a larger one, by
  `Content-Length` or as it streams, answers 413 and closes the connection.
- **Log**: one line per request (`glissando-library: <method> <path> <status>`) to stdout; never
  a body. An unexpected failure answers 500 `internalError` and logs its stack to stderr.

## The image

- The final stage carries Node (pinned by digest, the version of `.node-version`) and the Caddy
  binary copied from the pinned Caddy image; the service is `/usr/local/lib/glissando/`, and
  `/data` is owned by the container's user, so a named volume mounted there is writable.
- The entrypoint starts the service when `GLISSANDO_DATA_DIR` is set and Immich is on (the
  library route `deploy/library-on.caddy`), else the route `deploy/library-off.caddy` answers 404.
  `GLISSANDO_DATA_DIR` without `IMMICH_URL` stops the start with a message naming both. It waits
  on both processes and exits when either exits.
- `deploy/test-image.sh` adds: the discovery answers with a data volume and 404 without; a
  slideshow created survives a container restart on the same volume; a `PUT` with a stale
  revision gets 412.

## In the app

### Availability

`ServerLibraryAvailability` (`src/server-library/`) asks `./api/library` whenever Immich's
availability answers (not while it is `checking` or `offline`). The server library is **on** when
that answers the discovery and Immich is available; **offline** when the device is offline
(Immich's `offline`: the Glissando server is out of reach) and the last answer this session was
the discovery; otherwise **off**; **checking** until Immich and the first discovery have answered.
A discovery that cannot reach the server keeps the last answer; of two under way, the later one
counts. Off, nothing below shows and the app is as without this feature.

### What this device remembers

`ServerLibraryMemory` (`src/server-library/server-library-memory.ts`) keeps in `localStorage`,
fail-soft (a device whose storage refuses remembers nothing):

- whether the server library was on at the last answer (`glissando.serverLibrary`), so a cold
  start without the network shows the server section **offline** rather than hiding it;
- the last server list's cards (id, title, picture count, duration, music), which that offline
  section shows greyed out;
- where the last new slideshow went (`glissando.newSlideshowHome`), the wizard's first choice.

### Library (start screen)

- With the server library on or offline, the library has two sections: "On this device" (the
  device's slideshows, the "Library" eyebrow and "Open file" above it) and "On your Glissando
  server", each its own grid; the dashed "New slideshow" card ends the server grid. Server cards
  carry a chip "Server" at the cover's top left. Covers are Immich thumbnails.
- Under the server heading one muted line: "Pictures stay in Immich. Shared by everyone who opens
  this Glissando." Offline: "Offline. Server slideshows play again once this device reaches your
  Glissando server. To take one along, open it and choose “Keep a copy on this device”." — the
  cards greyed out, not opening, with the line "Needs your Glissando server".
- No server slideshow yet: the section shows only its heading, the line and the dashed card.
- No slideshow on the device: under "On this device" the muted line "Nothing on this device
  yet." instead of its grid.

### Where a new slideshow lives

With the server library on, the pictures step shows above everything a group "Where should it
live?" with two options: "This device" ("Pictures are downloaded and stored here. Plays
offline.") and "Glissando server" ("Pictures stay in Immich. Plays on every device at home,
online."); the last choice is remembered per device, "This device" by default. Once a picture is
in, both are disabled with "Chosen for this slideshow. Clear the pictures to change it." Not on:
no group, the step as before.

**Glissando server** chosen: the "From Immich" box comes first with "Open Immich" as the primary
button; the device drop zone is disabled with "A server slideshow only links photos from Immich.
Upload these to Immich first, or save this slideshow on this device." The "Open file" box is not
offered, and photos skipped as duplicates stay skipped (no "Add anyway"). Picked photos join at once
(no downscaling; tiles are Immich thumbnails) with the mint notice "Linked from Immich. Nothing is
downloaded now; playing loads the pictures from Immich." Duplicates are skipped as before
(ADR-0016). The music step is unchanged; "Create slideshow" uploads the music (if any), then
creates the document, under the overlay "Saving on your Glissando server …". A failure keeps the
wizard as it was with a coral toast naming it and "Try again".

### A server slideshow's screen

- The info panel gains a row under "Play": the server glyph, "On your Glissando server", below it
  "Pictures linked from Immich · edits saved for everyone", right a status: "Saved" (mint dot),
  "Saving …" while an edit is in flight. A device slideshow's row reads "On this device" with
  "All 24 from Immich · plays offline" or "20 from Immich, 4 from this device · plays offline"
  (only when the server library is on).
- **Edits** go through the same editors; each is a `PUT` with the revision last seen. 412: the
  edit is not applied, the screen shows the returned current version and the toast "Changed on
  another device. Showing the latest version." 404: back to start with "This slideshow no longer
  exists." A network failure: the edit is not applied, the coral toast "Couldn't save. Your
  Glissando server isn't answering." and the screen keeps the last saved version.
- **Adding pictures**: Immich only, linked, as in the wizard's server mode (the lead leaves out
  downscaling); "Add" stores them with one edit at the revision last seen.
- **Missing pictures**: a picture Immich answers 404 for (thumbnail or original) shows as a dashed
  tile "No longer in Immich"; below the strip the lemon notice "n pictures are no longer in Immich.
  They are skipped when playing." with "Remove them". The player skips it.
- **⋯ menu**: "Keep a copy on this device" (subtitle "Downloads n pictures. Plays offline."),
  "Export" (subtitle "A .glissando file, pictures downloaded from Immich"), separator, "Delete
  slideshow …" (subtitle "For every device"; the confirmation says so).
- **Keep a copy**: a sheet "Keep a copy on this device?" — "Downloads n pictures from Immich and
  the music. The copy plays offline and appears under “On this device”." / "Later edits to either
  one stay in that one." — Cancel / "Download and keep". It runs like an import (originals
  through `decodePicture`, Immich's faces as focus, claims, all or nothing, title made unique;
  a picture no longer in Immich fails the copy — `keepCopyOnDevice`), the header progress
  "Copying “title” … 34 %"; done: toast "Copied to this device" with "Open".
- A device slideshow's ⋯ menu adds (server library on) "Save on the server" ("A copy for every
  device at home"). All pictures from Immich: the sheet "Save on the server?" — "Every device that
  opens this Glissando can then play and edit it. Its n pictures stay in Immich and are linked,
  not uploaded. The music (3.1 MB) is stored on the server." / "The slideshow on this device stays
  as it is. The two copies are independent." — Cancel / "Save on the server". Some from the
  device: "n pictures are only on this device", listing their file names, "Upload them to Immich
  and add them from there, or save the slideshow without them." — Cancel / "Save without these
  n"; with no picture from Immich at all, the same sheet with Cancel only. Done: toast "Saved on
  the server" with "Open".

### Playing and exporting

- `ServerSlideshowStore` (`src/server-library/`) implements the slices of `LibraryStore` the
  slideshow screen, editors, player and exports use: `pictureBlob(assetId)` fetches the original
  through `/immich/` and makes the display rendition on the device (Immich's preview where the
  original cannot be decoded, as on import); `thumbnailBlob` is Immich's thumbnail; `musicBlob`
  the server's music; `pictureFocus` the largest Immich face box (ADR-0013's rule), asked once per
  picture and kept for the session (faces Immich could not give are logged and asked again
  later); `putPictureFocus` keeps it for the session only. Both stores share the type
  `SlideshowStore` (`src/library/stored-slideshow.ts`).
- Errors the screens tell apart: an unknown slideshow is `SlideshowNotFoundError` as on the
  device; an edit at a stale revision `SlideshowChangedError` carrying the current slideshow; a
  server out of reach or failing (network, 5xx) `ServerLibraryUnavailableError`; a picture Immich
  answers 404 for `PictureMissingFromImmichError`; Immich itself unavailable
  `ImmichUnavailableError` (also reported to `ImmichAvailability`). Edits are applied one at a
  time, each naming the revision the one before left; one that failed leaves the last saved
  version as the one the next edit names.
- The player prepares pictures ahead as for device slideshows (ADR-0014). It plays without the
  pictures the screen already knows are missing; one that fails with a 404 while playing is added
  to them and the player restarts without it, where its slide would have begun (`PlayerLayer`,
  `server-playing.ts`). Any other failure stops playing with "Immich isn't answering"; its Close
  goes back to the slideshow.
- Video and web page export work the same way (the pictures are fetched as they are needed).
  The video sheet's estimate does not depend on the pictures and shows as for a device
  slideshow; the web page sheet measures no picture, as that would download them all, and its
  size line says "pictures downloaded from Immich" instead of a number.
