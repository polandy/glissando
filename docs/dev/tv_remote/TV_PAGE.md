# The TV page

The share page (share_link/RECIPIENTS_PAGE.md) is also the TV page: `share.html`, served for
`/s/<token>` and for `/tv`. Its script (`src/share-page/main.ts`) picks the mode from
`location.pathname` (`isTvPath`).

- **Way A, `/tv`**: no slideshow yet. It makes a session (`POST /api/tv/sessions`) and shows the
  pairing card: the wordmark, "Show a slideshow here", "On your phone, open a slideshow and tap
  Show on TV. Scan the code, or type it.", the code in large mono letters and a QR code of
  `<origin>/?tv=<code>`, plus an "Allow sound" button (focused, so OK on a TV remote presses it)
  that unlocks the music and then says "Sound is allowed". When the stream says `show` (or a
  `snapshot` says `showing`) it loads `/api/tv/{tvKey}/show` as the share page loads a share
  link (`createShowApi`), and plays at once. At the end it shows "That was “<title>”" and
  "Press “Play again” on your phone, or pick another slideshow."; `restart` plays again from
  the start. When the phone has claimed the code but nothing is chosen, "Phone connected" with
  "Choose a slideshow on your phone." (the stream's `claimed` event or state). A slideshow gone
  meanwhile goes back to "Phone connected"; an unreachable server shows "Can't reach the
  server" and tries again after `TV_RETRY_MS` (5 s).
- **Way B, `/s/<token>`**: the page is as before. Under the start card's play button sits a
  "Control with your phone" button; pressing it makes the session (`POST /api/share/{token}/tv`)
  and puts the QR code of `<origin>/r/<remoteSecret>` with "Scan the code with your phone to control the slideshow." in
  the button's place. While a session exists and no remote is present (the snapshot's
  `remotePresent`, then the stream's `remote` event `{ "present": boolean }`), a corner chip with
  a small QR code and "Control with your phone" stays on the playing page; it disappears when a
  remote connects. A remote's `play` on the start card starts the slideshow as loaded, without
  the play button's fresh fetch.
- **Commands** (`src/tv-remote/tv-controller.ts`, no DOM, a `PlayerControl` port the page
  player satisfies): `play`, `pause`, `restart`, `seek` and `volume` map to the page player;
  `next` seeks to the start of the next picture (at the last it seeks to the end), `previous` to
  the start of the current picture, or the previous one when less than
  `PREVIOUS_RESTARTS_WITHIN_SECONDS` (2) in. Each command shows a short note on screen for
  `NOTE_SHOWN_MS` (1.8 s): "Paused", "Playing", "Next", "Previous", "Volume 70%".
- **Reports**: at once when a session takes the player, after each command and each player
  event (`playing`, `pause`, `ended`, a picture change, a volume change) and every
  `REPORT_EVERY_MS` (5 s) while playing, the page `PUT`s the `PlaybackState`. `pictureCount`
  counts the slides as the page plays them (a missing picture is skipped).
- **Music that can't start**: a command that would play but is refused by the browser's autoplay
  rule leaves the player paused, focuses its play button and reports `needsTvOk: true` until the
  page has been used.
- **The stream's trouble**: `EventSource` reconnects by itself; the page needs no state beyond the
  `snapshot` it is sent. A closed stream (a 404 `noSuchTv`) or `end` makes it start over — A: the
  slideshow is taken down, a new session and pairing card; B: the session is dropped, the button
  comes back and the chip goes, while the slideshow plays on.
- **Volume** is a master gain in `MutableMusicOutput` (0 to 1, default 1), separate from mute.
- **Sizes** grow with the screen (`--tv-scale` in `tv-page.css`), so the cards read from across
  the room; the focus a TV remote moves is always outlined.
- **Words**: `tvPage.*` in the catalogue, carried into the page by `share-page-languages.ts`
  (`TvPageWords`, `tv-page-words.ts`).
- **Code**: `src/tv-remote/` holds the protocol types and readers (`tv-protocol.ts`, shared by
  the TV page, the remote page and the app), `tv-controller.ts` and `tv-api.ts`.
  `src/share-page/` holds way A (`tv-pairing-page.ts`), way B (`tv-offer.ts`), the session
  between stream, controller and reports (`tv-session.ts`), the cards, note and chip
  (`tv-parts.ts`), the QR code (`qr-svg.ts`) and `tv-page.css`. The page player
  (`src/export-player/page-player.ts`) tells every change through its `changed` hook and can
  be taken down (`dispose`, `PageView.remove`). The browser test
  `share-page-tv.browser.test.ts` runs way A against a fake API (`testing/fake-tv-api*.ts`).
