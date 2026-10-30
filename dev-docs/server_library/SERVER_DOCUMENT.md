# The server document

A server slideshow is one JSON document (`src/server-library/server-document.ts`, shared by the
app and the server):

```json
{ "format": "glissando-server", "formatVersion": 1, "slideshow": { … } }
```

`slideshow` is the `.glissando` manifest's `slideshow` of format version 21
(`dev-docs/library/GLISSANDO_FILE.md`) with two differences:

- every picture has `immichAssetId` (required) and neither `file`, `thumbnail` nor `fileBytes`;
- each song of `songs` (the playlist, ADR-0023) has `musicId` (the server's id of the uploaded
  file) instead of `file`; `betweenSongs` as in the manifest.

A picture has no `video`: a server slideshow holds no video slides, because the server keeps no
clip (ADR-0034), and a document with a `video` is invalid like any unknown key.

A picture's focus (ADR-0041) is not part of this document: it is kept beside it, in `picture_focus`
keyed by `immichAssetId`, so a device can replace it without touching the slideshow's revision.

It is read as strictly as the manifest, with the same field checks (one implementation, shared
with `read-manifest.ts`): an unknown key, a value out of range, a missing `immichAssetId` or two
pictures with the same one make it invalid; the reason names the path and value. A picture's
`width` and `height` are Immich's (the asset's `width`/`height`) fitted into the display bound
(`fitWithin`, `DISPLAY_BOUND`); the rendition decoded at play time is authoritative for drawing.

`formatVersion` changes only for an incompatible change. A field the manifest gains as optional
(e.g. `pictureLength`, manifest version 9, `betweenSongs`, version 10, `portraitPictures` and a
picture's `alone`, version 11, a song's own volume `volumeDb`, version 15, or a song's
sample-track id `sampleTrack`, version 16) never changes it by itself: the service and the app
ship in one image, so a document with the field is always read by an app that knows it; only an
app still cached from before the update refuses it as invalid, until it updates. The slideshow's
colour grade `look` (manifest version 18, ADR-0044) bumped `formatVersion` to 4, its `mood`
(manifest version 19, ADR-0045) bumped it to 5, its `energyPacing` (manifest version 20,
ADR-0046) bumped it to 6, and its `repeatMusic` (manifest version 21, ADR-0047) bumped it to 7,
like the picture's `colours` and a card's picture background `tint` (ADR-0033) bumped it to 3.

A stored document the service cannot read, e.g. one at an older `formatVersion`, is left out of
the slideshow list and logged with its id and reason, so it hides no other slideshow; fetching it
by id still fails loud.

In the app a server slideshow is a `StoredSlideshow` whose pictures' `id` is their
`immichAssetId` and whose songs' `id` is their `musicId`.
