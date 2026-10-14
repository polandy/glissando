# The recipient's page

- Caddy answers `GET /s/<token>` with `/srv/share.html` (`Cache-Control: no-cache`) and a
  `Referrer-Policy: no-referrer`. The page is the same for every token: it reads its token from
  `location.pathname` and asks `/api/share/{token}`. Everything the page needs is inline, as in
  the web page export (html_export/THE_PAGE.md), so `/s/` and `/api/share/` are the only public
  paths. Its CSP allows `connect-src`, `img-src` and `media-src` to `'self'` and `blob:`, on
  top of the export's. Unlike the web page export, which embeds only the card fonts the given
  slideshow's cards use, `share.html` is built once for every slideshow it may ever show, so it
  embeds every card font (ADR-0032) unconditionally.
- **The player** is the web page export's (`src/export-player/`), with its page data read from
  the API instead of from inline blocks. It composes the share document with the app's
  `composeSlideshow` and the given beats, in the recipient's language. `openPicture(n)` fetches the picture
  URL, and each song is fetched once into a `blob:` URL before Play is wired.
- **Language**: German when `navigator.language` starts with `de`, else English. The page's words
  come from the catalogue (`sharePage.*`), with both languages built into the page.
- **Live**: Play and "Play again" fetch the document again first. The same revision plays on
  as loaded; a new one is composed and its songs fetched before it plays.
- **States** (`<html data-state>`): those of the export page, plus `starting` (after Play, until
  the player plays), `gone` (404 `notShared`, also from a picture or song) and `unreachable` (no
  network, or a 5xx). Any other answer is a fault and shows as `error`.
  - **Start card**: the first picture behind the veil, eyebrow "Shared slideshow", the title,
    "50 pictures · 4:10 · with music", Play, and "Shared with Glissando" at the bottom.
  - **Loading**: after Play, "Loading the first pictures …" with a ring until the player is
    playing.
  - **A late picture**: while the player waits for a picture it hasn't prepared yet (its
    `waiting` event, until `playing`), a "Loading" chip shows at the top right.
  - **Gone**: "This link doesn't work any more" and "Whoever shared the slideshow has turned the
    link off. Ask them for a new one." No title, no picture.
    A picture answering `notShared` while the slideshow plays stops the player and shows this
    card. Songs are fetched before playing, so a song's `notShared` shows it on Play or "Play
    again".
  - **Unreachable**: "Can't reach the slideshow right now", "The server it lives on isn't
    answering. It may be restarting; try again in a moment." and "Try again", which reloads the
    page.
  - A picture that fails to load (Immich no longer has it) is skipped, as in the app
    (server_library/IN_THE_APP.md).
- The app's service worker never answers `/s/` or `/api/` navigations (ADR-0005).
- The same page is the TV page at `/tv`, and offers phone control on `/s/<token>`
  (tv_remote/TV_PAGE.md).
- **Code**: `src/share-page/` holds the page's script (`main.ts`, which picks this page,
  `share-link-page.ts`, or the TV page), the API client (`share-api.ts`: `createShareApi` for a
  token, `createShowApi` for any base the same routes hang under; its failures as
  `ShareGoneError`, `ShareUnreachableError`, `ShareMediumMissingError`), the answer's reader (`share-answer.ts`, failing loud on any field
  the share document doesn't have; pictures and songs become `pictureKey(n)` and `songKey(n)`),
  the loaded slideshow with its skips (`shared-show.ts`), the words (`share-page-words.ts`) and
  the page's own parts (`share-parts.ts`, `share-page.css`). `build/share-page-plugin.ts` builds
  `share.html` into the build with `src/app/share-page/share-page-languages.ts`.
