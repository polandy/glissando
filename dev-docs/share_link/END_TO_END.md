# End to end

- A unit and contract suite for the repository, the handler (private and public routes,
  `forward_auth`, log redaction) and the share document.
- `deploy/test-image-library.sh`: a slideshow shared through the private API plays its document
  through `/api/share/<token>`, a picture comes back from the fake Immich through Caddy with no
  header but the allowed ones, and the same URL answers 404 once the link is turned off.
- A browser test opens `share.html` at `/s/<token>` against a fake share API (Playwright
  routing, as Vitest browser commands in `src/share-page/testing/`) and plays a generated three-picture slideshow
  to `ended`, also with a late picture (the chip) and a missing one (skipped), plays a new
  revision on "Play again", and shows `gone` (at the start, from a picture while playing, from a
  song on "Play again") and `unreachable` (then "Try again").
- E2E-043 shares a server slideshow from the info panel, opens the link in a second page,
  presses Play and waits for `playing`, then turns the link off and sees `gone` on reload. The
  fake server (`e2e/support/fake-glissando-server.ts`) answers `/s/` with the built `share.html`
  and the public API from its own state, the pictures straight from the fake rather than through
  Caddy. All test pictures are generated.
