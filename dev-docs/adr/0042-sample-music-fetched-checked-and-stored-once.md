# ADR-0042: Sample music is fetched when picked, checked by hash and stored once per device

**Status:** accepted

## Context

Glissando offers nine tracks of its own (`dev-docs/library/SAMPLE_MUSIC.md`), about 4 MB each,
37 MB together, published in `polandy/glissando-assets` `music/` and served by GitHub Pages. A
slideshow with a sample song must behave exactly like one with an own song — trim, fades,
volume, beats, every export — and work offline once the song is in it.

| Option                         | App size and offline                                             | Cost and limits                                                                                                |
| ------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Fetch when picked** (chosen) | nothing added to the app; a track is offline once added          | needs a connection for a preview or a new track; every install, self-hosted ones too, contacts the assets site |
| Bundle and precache the tracks | +37 MB in every install and every update's precache, all offline | most users never pick one; the service worker's first install grows tenfold                                    |
| Stream on play, never store    | nothing stored                                                   | the slideshow plays only online, and no export could carry the audio                                           |

How a downloaded track is trusted, and where it is kept:

- **Checked by its SHA-256 against the catalogue** (chosen): the bytes stored are the ones the
  release was made with; a changed file on the assets site fails loudly instead of slipping into
  slideshows. `fetch`'s `integrity` would verify natively but holds the body back until the end,
  so no progress could show; `crypto.subtle` is missing over plain HTTP on the LAN (ADR-0016).
  So the check is own pure SHA-256 code, about 4 MB hashed once per download.
- **One media record per track, `sample-<id>`** (chosen), instead of a copy per slideshow: a
  second slideshow adds the track without a download, also offline, and its beats and loudness
  are found once. Deleting a slideshow already keeps media another slideshow still plays
  (`deleteSlideshow`), and the clean-up of unreferenced media and the import's claims work by
  media id, so nothing else changes.

## Decision

- The audio is fetched from the build's base URL (`GLISSANDO_SAMPLE_MUSIC_URL`, default the
  assets site) only when previewed or added; a preview stores nothing. The covers, about 19 KB
  together, are bundled so the grid works offline.
- A download is checked against the catalogue's size and SHA-256 before it is stored; a mismatch
  is a failed download.
- An added track is stored under the media id `sample-<id>`, shared by every slideshow on the
  device that plays it; the song records `sampleTrack` so the credit travels with it.
- Sample music is on in every build; `GLISSANDO_SAMPLE_MUSIC=off` builds without it.

## Consequences

- Changing a track on the assets site needs a release with the new size and hash; until then
  that track fails to download in every install.
- A self-hosted install fetches from GitHub Pages unless built with its own base URL or with
  sample music off.
- An imported `.glissando` file's sample song is stored under a new id like any imported song,
  so it is not "on this device" for the picker; the picker downloads its own copy once.
