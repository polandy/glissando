# The server document

A server slideshow is one JSON document (`src/server-library/server-document.ts`, shared by the
app and the server):

```json
{ "format": "glissando-server", "formatVersion": 1, "slideshow": { … } }
```

`slideshow` is the `.glissando` manifest's `slideshow` of format version 10
(`dev-docs/library/GLISSANDO_FILE.md`) with two differences:

- every picture has `immichAssetId` (required) and neither `file`, `thumbnail` nor `fileBytes`;
- each song of `songs` (the playlist, ADR-0023) has `musicId` (the server's id of the uploaded
  file) instead of `file`; `betweenSongs` as in the manifest.

It is read as strictly as the manifest, with the same field checks (one implementation, shared
with `read-manifest.ts`): an unknown key, a value out of range, a missing `immichAssetId` or two
pictures with the same one make it invalid; the reason names the path and value. A picture's
`width` and `height` are Immich's (the asset's `width`/`height`) fitted into the display bound
(`fitWithin`, `DISPLAY_BOUND`); the rendition decoded at play time is authoritative for drawing.

`formatVersion` changes only for an incompatible change. A field the manifest gains as optional
(e.g. `pictureLength`, manifest version 9, or `betweenSongs`, version 10) keeps it at 1: the service and the app ship in
one image, so a document with the field is always read by an app that knows it; only an app still
cached from before the update refuses it as invalid, until it updates.

In the app a server slideshow is a `StoredSlideshow` whose pictures' `id` is their
`immichAssetId` and whose songs' `id` is their `musicId`.
