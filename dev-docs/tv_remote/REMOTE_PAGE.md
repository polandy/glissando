# The remote page

`/r/<remoteSecret>` is `remote.html`, built by `build/remote-page-plugin.ts` as the share page
is: one inline file, no app bundle, both languages built in (`remotePage.*` in the message
catalogue, German when `navigator.language` starts with `de`), `Referrer-Policy: no-referrer`,
`Cache-Control: no-cache`. Its script is `src/remote-page/main.ts`; it never imports Svelte.
Its policy allows only inline script and style, `data:` fonts and `connect-src 'self'`. The
design tokens come in both themes (dark through `prefers-color-scheme`; the page has no theme
switch) and the brand's fonts are inlined from `tokens.css`. The service worker never answers
`/r/` or `/tv` (`SERVER_ROUTES` in `src/sw/respond.ts`). A path that is not `/r/` and 22
base64url characters shows the ended card without opening a stream.

- **Layout** (as the mockup): a header with the wordmark; a status pill; a card with the title
  and "Picture 19 of 48 · Playing" (or "Paused", "Finished"); the scrubber over the whole
  slideshow in seconds with both times; previous, a large play/pause, next; a volume slider with its
  percentage; "Start over" and "Disconnect" (destructive text).
- **States**: connecting before the first snapshot (lemon pill "Connecting …"); connected
  (mint pill "Showing on TV"; "Waiting for the TV to show a slideshow …" in the card while the
  snapshot has no state); the stream reconnecting (lemon pill
  "Reconnecting …", controls disabled); `tvPresent: false` (lemon pill "The TV is not there"
  and a note "The TV closed its page. Open it on the TV again to carry on.", controls disabled);
  `needsTvOk` (a note "Press OK on the TV once to allow sound."); ended ("Finished", play
  becomes "Play again", which sends `restart`); `end` or 404 `noSuchTv` (a card "This remote has ended" with the
  explanation that the TV was disconnected or closed). The screen is kept on
  (`navigator.wakeLock`) where the browser has it.
- **Time**: while `playing`, the position is advanced locally from the last report by the
  injected clock, and corrected by each report. The scrubber sends `seek` on release, not while
  dragging.
- **Stream**: a stream event that does not read is reported and dropped. When the browser has
  given up on the `EventSource` (`CLOSED`), the page waits `RECONNECT_DELAY_MS` and probes the
  events URL with a GET: 404 `noSuchTv` ends the remote, a 2xx reopens the stream (the probe is
  aborted, so the TV may see the remote present for a moment), anything else probes again.
- **Commands** go out as POSTs; a 409 `tvAway` becomes the "The TV is not there" state; a 404
  `noSuchTv` ends the remote; any other failure is shown on the page as an error with "Try
  again", which resends the failed command.
- **Code**: `src/remote-page/` — `remote-model.ts` (state and interpolation, pure),
  `remote-stream.ts` (the `EventSource` behind a port), `remote-view.ts`, `main.ts`,
  `remote-page-words.ts`, `remote-page-contract.ts` (the secret's path, the words block),
  `remote-page-html.ts` (the page and its policy), `remote-page.css`; the words from the
  catalogue in `src/app/remote-page/remote-page-languages.ts`; the dark tokens and inlined fonts
  in `build/remote-page-styles.ts`. Its browser test runs against `testing/fake-remote-api*.ts`:
  Playwright routing for the page and commands, the event stream from a middleware on the test
  server (`fakeRemoteStreamPlugin`), since a fulfilled stream ends and one continued to another
  origin breaks `connect-src 'self'`.
