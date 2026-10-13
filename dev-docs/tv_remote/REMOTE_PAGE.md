# The remote page

`/r/<remoteSecret>` is `remote.html`, built by `build/remote-page-plugin.ts` as the share page
is: one inline file, no app bundle, both languages built in (`remotePage.*` in the message
catalogue, German when `navigator.language` starts with `de`), `Referrer-Policy: no-referrer`,
`Cache-Control: no-cache`. Its script is `src/remote-page/main.ts`; it never imports Svelte.

- **Layout** (as the mockup): a header with the wordmark; a status pill; a card with the title
  and "Picture 19 of 48 · Playing" (or "Paused", "Finished"); the scrubber over the whole
  slideshow with both times; previous, a large play/pause, next; a volume slider with its
  percentage; "Start over" and "Disconnect" (destructive text).
- **States**: connected (mint pill "Showing on TV"); the stream reconnecting (lemon pill
  "Reconnecting …", controls disabled); `tvPresent: false` (lemon pill "The TV is not there"
  and a note "The TV closed its page. Open it on the TV again to carry on.", controls disabled);
  `needsTvOk` (a note "Press OK on the TV once to allow sound."); ended ("Finished", play
  becomes "Play again"); `end` or 404 `noSuchTv` (a card "This remote has ended" with the
  explanation that the TV was disconnected or closed). The screen is kept on
  (`navigator.wakeLock`) where the browser has it.
- **Time**: while `playing`, the position is advanced locally from the last report by the
  injected clock, and corrected by each report. The scrubber sends `seek` on release, not while
  dragging.
- **Commands** go out as POSTs; a 409 `tvAway` becomes the "The TV is not there" state; any
  other failure is shown on the page as an error with "Try again".
- **Code**: `src/remote-page/` — `remote-model.ts` (state and interpolation, pure),
  `remote-stream.ts` (the `EventSource` behind a port), `remote-view.ts`, `main.ts`,
  `remote-page-words.ts`, `remote-page.css`.
