# The server document

A server slideshow is one JSON document (`src/server-library/server-document.ts`, shared by the
app and the server):

```json
{ "format": "glissando-server", "formatVersion": 7, "slideshow": { … } }
```

`slideshow` is the `.glissando` manifest's `slideshow` of format version 21
(`docs/dev/library/GLISSANDO_FILE.md`) with two differences:

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

## Versions

`formatVersion` changes only for an incompatible change. A field the manifest gains as optional
(e.g. `pictureLength`, manifest version 9, `betweenSongs`, version 10, `portraitPictures` and a
picture's `alone`, version 11, a song's own volume `volumeDb`, version 15, or a song's
sample-track id `sampleTrack`, version 16) never changes it by itself: the service and the app
ship in one image, so a document with the field is always read by an app that knows it; only an
app still cached from before the update refuses it as invalid, until it updates.

| `formatVersion` | Change                                                                   | Manifest fields up to |
| --------------- | ------------------------------------------------------------------------ | --------------------- |
| 1               | first version; a single `music` until the playlist `songs` (ADR-0023)    | 11                    |
| 2               | the slideshow's `openingCard` and `closingCard` (ADR-0032)               | 12                    |
| 3               | a picture's `colours`, a card's `entrance` and picture `tint` (ADR-0033) | 16                    |
| 4               | the slideshow's colour grade `look` (ADR-0044)                           | 18                    |
| 5               | the slideshow's `mood` (ADR-0045)                                        | 19                    |
| 6               | the slideshow's `energyPacing` (ADR-0046)                                | 20                    |
| 7               | the slideshow's `repeatMusic` (ADR-0047)                                 | 21                    |

Every version from 1 on is read (ADR-0059), by a chain of steps
(`src/server-library/server-document-versions.ts`): a document is rewritten into the current
shape and checked against the keys its own version carries, so the service lists and serves it as
the current version and the next save stores it so; an older document a cached app sends is
stored as the current version too. Version 1's single `music` becomes a playlist of that
song (a document with both is invalid), and versions 1 and 2 go through the manifest's own step
to version 13 (grey `colours`, the old card entrance and default tint, ADR-0054). Versions 3 to 6
need no rewrite: they only lack a later optional field. A version bump adds a row here, the
manifest fields version to `MANIFEST_FIELDS_BY_VERSION`, a fixture under
`src/server-library/testing/server-format-versions/` and, if the shape changed, a step.

A stored document the service cannot read, e.g. one at a newer `formatVersion` or a damaged one,
is left out of the slideshow list and logged with its id and reason, so it hides no other
slideshow; fetching it by id still fails loud.

In the app a server slideshow is a `StoredSlideshow` whose pictures' `id` is their
`immichAssetId` and whose songs' `id` is their `musicId`.
