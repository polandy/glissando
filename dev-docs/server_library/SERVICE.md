# The service

`server/` — TypeScript, bundled into one file at image build (`npm run build:server`, into
`dist-server/`), run by the image's Node. Node's types are declared for the parts used
(`server/node-modules.d.ts`), as `e2e/` does.

- **Config** (`server/config.ts`), parsed once at start: `GLISSANDO_DATA_DIR` (a writable
  directory; the database is `library.sqlite` in it) and the internal `GLISSANDO_LIBRARY_PORT`
  (loopback port, set by the entrypoint). Unknown `GLISSANDO_*`/`IMMICH_*` settings stop the
  start (the entrypoint already does this; `GLISSANDO_DATA_DIR` joins its known settings). The
  entrypoint hands the service these two settings only, never the Immich key.
- **Storage** (`node:sqlite`): tables `slideshows(id, revision, created_at, document)`,
  `music(id, content_type, bytes, uploaded_at)`, `music_beats(music_id, beats)`,
  `picture_focus(asset_id, detector, focus, found_at)` (ADR-0041) and
  `share_links(slideshow_id, token, created_at)` (share_link/STORAGE.md), times in
  milliseconds since the epoch; WAL mode; every write in one transaction. Whether music or a
  picture is referenced is read from the documents (`json_extract`), so no second record of it can
  drift.
- **Ports**: a `LibraryRepository` (the SQLite adapter and an in-memory fake run the same contract
  suite), a clock, an id source and a random source (for share tokens), all injected into the request handler, which is a pure
  function of request → response tested in-process without sockets.
- **Request bodies** are read up to the path's limit (`maxBodyBytes`); a larger one is read to
  its end and dropped, then answers 413 and closes the connection, so the client receives the 413
  rather than a reset connection.
- **Log**: one line per request (`glissando-library: <method> <path> <status>`) to stdout; never
  a body, and never a share token (share_link/HTTP_API.md, Logs). An unexpected failure answers 500 `internalError` and logs its stack to stderr.
