# ADR-0017: The web page export is one self-contained .html with the player engine inside

**Status:** accepted

## Context

A slideshow should also go out as something far smaller than the MP4 (ADR-0015): a web page with
the pictures scaled down, the music and a player, which plays offline in a browser without
Glissando. The recipient opens it by double-click, from a mail attachment, from Downloads or from
the Files app, so it runs from `file://` or an Android `content://` URI, never from a server.

Measured 2026-10-10 on a generated slideshow (50 photo-like 4000 × 3000 pictures, 3 min of music as
MP3 at 192 kbit/s, 4.3 MB). Sizes, all measured; 3840 px (4K) was not measured, its size is an
estimate (below):

| Pictures (JPEG q 0.85, long edge) | 1280 px       | 1920 px        | 2560 px (measured) |
| --------------------------------- | ------------- | -------------- | ------------------ |
| Pictures alone                    | 5.8 MB        | 15.8 MB        | 35.3 MB            |
| Zip, stored / deflate             | 10.2 / 9.7 MB | 20.2 / 19.1 MB | 39.7 / 37.8 MB     |
| One `.html`, base64 inside        | 13.6 MB       | 27.0 MB        | 53.0 MB            |
| That `.html` gzipped              |               | 19.3 MB        |                    |

The MP4 at 1080p for the same 250 s is 255 MB. WebP q 0.8 was 3–4 × smaller than JPEG on these
generated pictures. Opened from `file://` in the pinned Playwright image (Chromium, Firefox
without WebGL2, WebKit):

- A picture beside the page shows, but Chromium and WebKit refuse it to WebGL (`texImage2D` throws
  `SecurityError`). `fetch`/XHR of it fail there as well, and 2D canvases are tainted. Firefox
  allows all of these.
- A picture inside the page, as a `blob:` or `data:` URL, uploads to WebGL. Music plays either way.
- WebKit's decode worker reads no Blob in a page from `file://` (`createImageBitmap` fails with
  "Cannot load blob:null/…"); the main thread decodes the same Blob.
- A 27 MB page is ready in 80–190 ms, and its 50 pictures unpack in 80–120 ms.

The player engine (`src/player/`) built as a standalone bundle is 39 KB (12.5 KB gzipped), plus
the caption font (Instrument Sans, 36 KB).

## Decision

- **One self-contained `.html` file.** Pictures, music, font and player are all inside it as
  base64. It plays wherever it is opened, and WebGL works because nothing is fetched from beside it.
- **The page runs Glissando's own player engine**, built as a second standalone bundle. It reads
  the same slideshow JSON as the app, so trim, fades, captions and each picture's own Ken Burns,
  duration and transition carry over unchanged. Only the page's start card, controls and end card
  are written for the export, in plain TypeScript.
- **Pictures are JPEG q 0.85**, scaled down to 1280, 1920 or 3840 px on the long edge, never up.
  The **music keeps its original bytes**, and the player applies trim and fades.

## Consequences

- Base64 costs a third on disk. A mail or messenger that compresses gets almost all of it back
  (19.3 MB gzipped against 19.1 MB for the deflated zip).
- No unpacking step. A zip would have to be unpacked first, and Windows opens a zip like a folder,
  which leaves the page without its pictures. Its pictures beside the page would also force
  Chromium and Safari onto the DOM renderer.
- WebP would be smaller, but Safari's canvas cannot encode it, so the same slideshow would export
  differently per browser. Re-encoding only the part of the music that plays would be smaller too,
  but Firefox and Chromium on Linux have no AAC encoder. Both stay open for later.
- The 4K page (about 115 MB estimated for 50 pictures) is too big for mail, and the sheet says so.
  The whole page sits in the recipient's memory as text, but the player decodes only the pictures
  around the current one.
- The app carries the export player as an extra asset (about 75 KB with the font), loaded on the
  first export and precached for offline use.

## Alternatives

- **Zip with `index.html` + `pictures/` + music**: a third smaller on disk. Rejected for the
  unpacking step and the WebGL refusal above.
- **A page that streams from a server**: Glissando needs no server (SCOPE.md), and a recipient
  without a connection could not play it.
- **A second, small player written only for the export**: it would drift from the app's player
  on every new effect. Reusing the engine costs 12.5 KB gzipped.
