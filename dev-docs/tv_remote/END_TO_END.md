# End to end

- Unit and contract tests: `tv-hub` (codes, claim, lifetime and eviction on a fake clock,
  replay on connect, command routing, state validation), the HTTP layer (private and public
  routes, streams as plain sinks, redaction), the protocol readers, `tv-controller` (every
  command on a fake `PlayerControl`, picture starts, `needsTvOk`), the remote model (time
  interpolation) and the app's session.
- `deploy/test-image-library.sh`: a session made through the public API, claimed and shown
  through the private one; its stream carries `show`, a picture comes back through Caddy on the
  session's key, and a way B session answers its command with a TV that has the stream open.
- Browser tests: `share.html` at `/tv` and at `/s/<token>` against a fake API (pairing card,
  a `show` event plays, commands move the player and are reported, the QR chip), and
  `remote.html` against a fake stream (states, the scrubber, a 409).
- Two e2e cases (`e2e/tv-remote.spec.ts`) drive a phone page and a TV page against the fake
  server (`e2e/support/fake-glissando-server.ts`), which runs the real hub and routes in the
  test's process: way A claims by code, chooses, presses pause on the remote and the TV reports
  `paused`; way B opens the remote from the share page's button, plays, pauses and skips. A
  stream is held open by `vite preview` (`e2e/support/tv-stream-plugin.ts`), since a fulfilled
  route always ends. All test pictures are generated.
