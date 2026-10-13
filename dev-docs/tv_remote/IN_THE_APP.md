# In the app

- **Entry**: with the server library on, the info panel of a server slideshow gets a "Show on TV"
  row under the share row (`TvRow.svelte`: a TV icon, "Show on TV", "Play it on a TV and use
  your phone as the remote", chevron), and the start screen opens the same sheet when the page
  was opened as `/?tv=<code>` (the TV's QR code); the query is removed from the address after it
  is read, other parameters and the hash stay. A device slideshow shows no row.
- **Sheet** (`TvSheet.svelte`; a dialog on desktop, a bottom sheet on the phone; closing gives
  focus back to the row):
  1. **Code**: "Show on TV", "Open <address>/tv in the TV's browser, then scan the code on the
     screen with your camera or type it here.", four single-letter boxes (upper-cased, only the
     code's letters; a pasted code fills them; Backspace in an empty box removes the letter
     before), "n of 4 letters" and "Connect". A prefilled code connects at once; a `?tv=` that is
     not four letters opens on empty boxes. The camera isn't read in the app: the QR code opens
     the app itself.
  2. **Pick** (after a claim): a mint pill "Connected to TV <code>", "Which slideshow should the
     TV show?" and the server slideshows as cards (title, pictures · duration; no cover), the one
     the sheet was opened from selected, from the start screen the first one. "Show on TV" posts
     `show` and navigates to `/r/<remoteSecret>`; "Disconnect" closes the sheet like ✕.
  3. **Errors** at their cause: "That code doesn't match a TV" (a lemon card) with "Type it
     again" (404 `noSuchCode`); the server not answering shows the server sheet's usual error
     with "Try again", which repeats the request; a 404 `noSuchTv` on `show` says the TV was
     closed, back to the code step; a 404 `notFound` (the slideshow is gone) reads the list again.
- **Disconnecting**: closing the sheet (✕, "Disconnect", or leaving the screen) before a
  slideshow was shown sends the public `disconnect` command, so the TV goes back to its code; a
  claim answered after the sheet closed is disconnected the same way. Once shown, the TV belongs
  to the remote page and closing does nothing to it.
- **Code**: `src/app/tv-remote/`: `tv-session.ts` (the sheet's steps and calls through a
  `TvApi` port, unit-tested with a fake), `TvControl.svelte` (row plus sheet), `TvRow.svelte`,
  `TvSheet.svelte` with `TvCodeBoxes.svelte` and `TvSlideshowCards.svelte`, `tv-code.ts`
  (normalising typed or pasted codes, reading `?tv=`). The HTTP calls are
  `src/server-library/http-tv-client.ts` (`TvRefusedError` for the server's refusals); the
  browser wiring and the `?tv=` read are `src/app/server-library/server-slideshow-sessions.ts`.
  Words: `tvSheet.*` in `catalogue-{de,en}-tv-sheet.ts`.
