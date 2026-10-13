# The TV page

The share page (share_link/RECIPIENTS_PAGE.md) is also the TV page: `share.html`, served for
`/s/<token>` and for `/tv`. Its script (`src/share-page/main.ts`) picks the mode from
`location.pathname`.

- **Way A, `/tv`**: no slideshow yet. It makes a session (`POST /api/tv/sessions`) and shows the
  pairing card: the wordmark, "Show a slideshow here", "On your phone, open a slideshow and tap
  Show on TV. Scan the code, or type it.", the code in large mono letters and a QR code of
  `<origin>/?tv=<code>`, plus an "Allow sound" button (focused, so OK on a TV remote presses it)
  that unlocks the music. When the stream says `show` it loads `/api/tv/{tvKey}/show` as the
  share page loads a share link, and plays at once. At the end it shows "That was “<title>”" and
  "Press “Play again” on your phone, or pick another slideshow."; `restart` plays again. When
  the phone has claimed the code but nothing is chosen, "Phone connected" with "Choose a
  slideshow on your phone." (the stream's `claimed` state).
- **Way B, `/s/<token>`**: the page is as before. Its start card gets a "Control with your
  phone" button; pressing it makes the session (`POST /api/share/{token}/tv`) and swaps the
  card's text for the QR code of `<origin>/r/<remoteSecret>`. While a session exists and no
  remote has been connected since the stream's last `end` or start, a corner chip with a small
  QR code and "Control with your phone" stays on the playing page; it disappears when a remote
  connects. (The page learns the remote's presence from the TV stream's `remote` event
  `{ "present": boolean }`, sent whenever the first remote stream opens or the last closes.)
- **Commands** (`src/tv-remote/tv-controller.ts`, no DOM, a `PlayerControl` port): `play`,
  `pause`, `restart`, `seek` and `volume` map to the page player; `next` seeks to the start of
  the next picture (at the last it seeks to the end), `previous` to the start of the current
  picture, or the previous one when less than `PREVIOUS_RESTARTS_WITHIN_SECONDS` (2) in. Each
  command shows a short note on screen for 1.8 s ("Paused", "Playing", "Next", "Previous",
  "Volume 70%").
- **Reports**: after each command and each player event (`playing`, `pause`, `ended`, a
  picture change, a volume change) and every `REPORT_EVERY_MS` (5 s) while playing, the page
  `PUT`s the `PlaybackState`.
- **Music that can't start**: a command that would play but is refused by the browser's autoplay
  rule leaves the player paused and reports `needsTvOk: true` until the page has been used.
- **The stream's trouble**: `EventSource` reconnects by itself; the page needs no state beyond the
  `snapshot` it is sent. A 404 `noSuchTv` or `end` makes it start over (A: a new session and
  pairing card; B: back to the start card, session dropped).
- **Volume** is a master gain in `MutableMusicOutput` (0 to 1, default 1), separate from mute.
- **Code**: `src/tv-remote/` holds the protocol types and readers (`tv-protocol.ts`, shared by
  the TV page, the remote page and the app), `tv-controller.ts` and `tv-api.ts`.
