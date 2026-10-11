# SHARE_LINK.md — Share a server slideshow by link

A slideshow on the Glissando server (`dev-docs/SERVER_LIBRARY.md`) can get a link that anyone can
open in a browser to watch it, without signing in. They can't change anything, and they can't
see Immich. ADR-0025 records the choices. Mockup:
https://polandy.github.io/glissando-assets/mockups/share-link/.

## The link

- `https://<host>/s/<token>`. The host is the origin the app is open at. The token is 16 random
  bytes as base64url without padding (22 characters, `SHARE_TOKEN_BYTES`), made by the
  service's injected random source.
- **One link per slideshow.** It is valid until it is turned off. Turning it off deletes the
  token, and sharing again makes a new one. Deleting the slideshow deletes its link.
- **Live**: the recipient's page loads the slideshow as it is now whenever it starts (the page
  opens, Play, "Play again"), so edits show up there.
- The token is stored as it is, so every device of the household can show the link again.
  Only the private API, which sits behind the owner's sign-in, ever answers with it.
- **What a recipient gets**: the share document (below), the pictures by their position, and the
  songs by their position. Never Immich asset ids, music ids, file names, exact capture dates,
  the slideshow's id, or anything about other slideshows.

## The HTTP API

### Private (under `/api/library/`, behind the owner's sign-in)

| Request                                                   | Answer                                                                                               |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `POST /api/library/slideshows/{id}/share`, JSON body `{}` | 201 `{ "token", "createdAt" }`; 200 with the same when already shared; 404 `notFound`; 415 `notJson` |
| `DELETE /api/library/slideshows/{id}/share`               | 204; 404 `notFound` (no such slideshow) or `notShared`                                               |

- `GET /api/library/slideshows` (each entry) and `GET /api/library/slideshows/{id}` also carry
  `"share": { "token", "createdAt" }` or `"share": null`. `createdAt` is an ISO 8601 date-time
  in UTC.
- `POST` needs `Content-Type: application/json`, like every other write, so another site can't
  turn a link on through the owner's browser (SERVER_LIBRARY.md, Media type).

### Public (under `/api/share/<token>/`, no sign-in)

| Request                                          | Answer                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `GET /api/share/{token}`                         | 200 `{ "revision", "slideshow": <share document>, "beats": [ <MusicBeats> or null per song ] }`; 404 `notShared` |
| `GET /api/share/{token}/{revision}/pictures/{n}` | 200 the picture (JPEG, Immich's preview, through Caddy); 404 `notShared` or `noSuchPicture`                      |
| `GET /api/share/{token}/songs/{n}`               | 200 the song's bytes with their `Content-Type`; 404 `notShared` or `noSuchSong`                                  |

- **The share document** is the server document's `slideshow` with the following changes, made
  by a pure function (`server/share-document.ts`). Everything else stays.
  - Each picture's `immichAssetId` and any name are removed. Pictures are addressed by their
    position `n` (0-based).
  - Each picture's `capturedAt` is cut down to the first day of its month (UTC). The title
    fallback (COMPOSITION.md, Title) still works, and no exact date leaks.
  - Each song's `musicId` and file name are removed. Songs are addressed by their position in
    the playlist.
- **`{revision}` in a picture URL is only there for the cache**, so a reorder never serves a
  stale picture from the cache. The service always answers with picture `n` of the current
  revision. Pictures and songs answer with `Cache-Control: private, max-age=86400`, and the
  document answers with `no-store`.
- **Unknown token** and a turned-off link answer the same 404 `notShared`, so the API never
  says whether a token ever existed.
- Every other method or path under `/api/share/` answers 404.
- Without slideshows on the server (no data volume, `deploy/library-off.caddy`), `/api/share/` and
  `/s/` answer 404.

### How a picture is served

Caddy owns the Immich key (ADR-0013), and the service never sees it. For
`/api/share/{token}/{revision}/pictures/{n}`, Caddy asks the service first (`forward_auth`
to `GET /internal/share-picture/{token}/{n}` on loopback; this path is never routed from
outside):

- The service answers 200 with `X-Glissando-Immich-Asset: <uuid>`, or 404 `notShared` /
  `noSuchPicture` (also for an asset id that is no UUID, so nothing else lands in Immich's path).
  Caddy passes a non-2xx answer on to the client as it is. Caddy answers every other
  `/internal/` request 404.
- On 200, Caddy fetches `GET /api/assets/<uuid>/thumbnail?size=preview` from Immich with the key.
  Before the response goes to the recipient, Caddy drops every response header except
  `Content-Type`, `Content-Length` and `ETag` (the last two only when Immich sends both), and
  sets the cache header above. A non-2xx answer from Immich reaches the recipient as its status
  only, with no body and no header.
- **Picture size**: Immich's preview has its short edge at Immich's "Preview resolution"
  setting (1440 by default). At 2160, it covers what a 3840×2160 frame shows. The self-hosting
  guide recommends 2160 for a TV. The preview carries no GPS, camera or capture date, and its
  orientation is already applied (measured with Immich v3.3.1, see the mockup's Concept tab).

### Logs

The token is a secret. The service logs `/api/share/<token>/…` and `/s/<token>` with the token
replaced by `…`, and Caddy's log filter does the same: the share routes log to their own
logger (`log_name share`, its errors too), which also drops the query and the `Referer`. The owner's own proxy logs are theirs to
configure, and the self-hosting guide says so.

## Storage

The table is `share_links(slideshow_id PRIMARY KEY REFERENCES slideshows ON DELETE CASCADE,
token UNIQUE, created_at)`. The `LibraryRepository` contract gains `share(id, { token, createdAt })`,
`unshare(id)`, `shareOf(id)` and `slideshowByShareToken(token)`; the service makes the token.
The SQLite adapter turns foreign keys on for the cascade. The SQLite adapter and the in-memory fake run
the same contract suite.

## The recipient's page

- Caddy answers `GET /s/<anything>` with `/srv/share.html` (`Cache-Control: no-cache`) and a
  `Referrer-Policy: no-referrer`. The page is the same for every token: it reads its token from
  `location.pathname` and asks `/api/share/{token}`. Everything the page needs is inline, as in
  the web page export (HTML_EXPORT.md, The page), so `/s/` and `/api/share/` are the only public
  paths. Its CSP allows `connect-src`, `img-src` and `media-src` to `'self'` and `blob:`, on
  top of the export's.
- **The player** is the web page export's (`src/export-player/`), with its page data read from
  the API instead of from inline blocks. It composes the share document with the app's
  `composeSlideshow` and the given beats, in the recipient's language. `openPicture(n)` fetches the picture
  URL, and each song is fetched once into a `blob:` URL before Play is wired.
- **Language**: German when `navigator.language` starts with `de`, else English. The page's words
  come from the catalogue (`sharePage.*`), with both languages built into the page.
- **States** (`<html data-state>`): those of the export page, plus `gone` (404 `notShared`) and
  `unreachable` (the document fetch fails or answers 5xx).
  - **Start card**: the first picture behind the veil, eyebrow "Shared slideshow", the title,
    "50 pictures · 4:10 · with music", Play, and "Shared with Glissando" at the bottom.
  - **Loading**: after Play, "Loading the first pictures …" with a ring until the player is
    playing.
  - **A late picture**: while the player waits for a picture it hasn't prepared yet, a
    "Loading" chip shows at the top right.
  - **Gone**: "This link doesn't work any more" and "Whoever shared the slideshow has turned the
    link off. Ask them for a new one." No title, no picture.
  - **Unreachable**: "Can't reach the slideshow right now", "The server it lives on isn't
    answering. It may be restarting; try again in a moment." and "Try again".
  - A picture that fails to load (Immich no longer has it) is skipped, as in the app
    (SERVER_LIBRARY.md, Playing and exporting).
- The app's service worker never answers `/s/` or `/api/` navigations (ADR-0005).

## In the app

- **Share row** in the info panel, its own row under the server row (`ShareRow.svelte`):
  - Server slideshow, not shared: link icon, "Share link", "Anyone with the link can watch",
    chevron.
  - Shared: "Shared by link", the link without its scheme (mono, ellipsis), a mint "On" pill,
    chevron.
  - Device slideshow: dimmed, not a button, "Save it on your Glissando server to share it by
    link."
- **Share sheet** (`ShareSheet.svelte`; a dialog on desktop, a bottom sheet on the phone; closing
  gives focus back to the row):
  - **Not shared**: "Share by link", the summary "<title> · 50 pictures · 4:10 · with music", three
    lines (anyone with the link can watch in a browser, without signing in or installing
    anything; they see the slideshow in 4K with its music and captions, and nothing else; edits
    show up, and it works until you turn it off), then "Cancel" and "Create link".
  - **Shared**: the link (read-only, mono; a tap or click selects all of it) with "Copy" where
    the browser offers the clipboard, so not over plain `http:` (then "Copied" for 2 s, from the
    injected scheduler), "Share …" where `navigator.share` exists, "Open as viewer" (a new tab), and
    "QR code", which shows or hides the link's QR code. Below that, "Created 11 Oct 2026 · works
    until you turn it off", then "Turn off link" (destructive text button) and "Done".
  - **Turn off?**: "Turn off the link?", "Anyone who has it can no longer watch “<title>”. If you
    share it again, it gets a new link and this one stays off.", then "Cancel" and "Turn off
    link" (coral). Afterwards the sheet closes and a toast says "Link turned off".
  - **Home network note** (lemon), in both states, when the app's origin is a home network
    address: plain `http:`, a `localhost`, `.local` or `.lan` name, or a private, loopback or
    link-local IP (`isHomeNetworkOrigin`, a pure function). The note reads: "This link only works
    on your home network. Glissando is open at a home address here. To share with someone
    elsewhere, open Glissando through its public address and share from there."
  - **Failures**: the server not answering shows the server sheet's usual error with "Try again".
- **QR code**: `uqr` (MIT, no dependencies) encodes the link. It's the one new dependency,
  because QR encoding with error correction and masking is a well-specified but error-prone
  algorithm.
- `src/app/share-link/`: the session (`share-link-session.ts`, its states and the calls through a
  `ShareLinkApi` port, unit-tested with a fake), the origin check, and the sheet's parts.
- **Reading the link**: the screen of a server slideshow asks `GET /api/library/slideshows/{id}`
  for its `share` as it opens; until it answers, the row reads as not shared and the sheet says
  "Reading the link …". `DELETE` answering 404 `notShared` counts as turned off.
- The QR code is drawn as one SVG path in `--gl-qr-dark` on `--gl-qr-light`, dark on white in
  both themes, with medium error correction and a two-module quiet zone.

## End to end

- A unit and contract suite for the repository, the handler (private and public routes,
  `forward_auth`, log redaction) and the share document.
- `deploy/test-image-library.sh`: a slideshow shared through the private API plays its document
  through `/api/share/<token>`, a picture comes back from the fake Immich through Caddy with no
  header but the allowed ones, and the same URL answers 404 once the link is turned off.
- A browser test opens `share.html` against a fake server and plays to `ended`.
- An e2e case (written after the owner's OK on the built change) shares a slideshow from the
  info panel, opens the link in a second page, presses Play and waits for `playing`, then turns
  the link off and sees `gone` on reload. All test pictures are generated.
