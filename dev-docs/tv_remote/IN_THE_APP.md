# In the app

- **Entry**: with the server library on, the info panel of a server slideshow gets a "Show on TV"
  row under the share row (`TvRow.svelte`: a TV icon, "Show on TV", "Play it on a TV and use
  your phone as the remote", chevron), and the start screen opens the same sheet when the page
  was opened as `/?tv=<code>` (the TV's QR code); the query is removed from the address after it
  is read. A device slideshow shows no row.
- **Sheet** (`TvSheet.svelte`; a dialog on desktop, a bottom sheet on the phone; closing gives
  focus back to the row):
  1. **Code**: "Show on TV", "Open <address>/tv in the TV's browser, then scan the code on the
     screen with your camera or type it here.", four single-letter boxes (upper-cased; paste of
     four letters fills them), "Connect". A prefilled code connects at once. The camera isn't
     read in the app: the QR code opens the app itself.
  2. **Pick** (after a claim): a mint pill "Connected to the TV", "Which slideshow should the TV
     show?" and the server slideshows as cards (the one the sheet was opened from selected),
     "Show on TV" and "Disconnect". "Show on TV" posts `show` and navigates to
     `/r/<remoteSecret>`.
  3. **Errors** at their cause: "That code doesn't match a TV" with "Type it again" (404
     `noSuchCode`); the server not answering shows the server sheet's usual error with "Try
     again"; a 404 `noSuchTv` on `show` says the TV was closed, back to the code step.
- **Code**: `src/app/tv-remote/`: `tv-session.ts` (the sheet's steps and calls through a
  `TvApi` port, unit-tested with a fake), `TvRow.svelte`, `TvSheet.svelte`, `tv-code.ts`
  (normalising typed or pasted codes, reading `?tv=`).
