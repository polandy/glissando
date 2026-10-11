# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] **HIGH** Start animation — mockup approved: variant A "glide" (https://polandy.github.io/glissando-assets/mockups/start-animation/?v=glide); plays on first launch only (flag stored client-side), tap skips, reduced motion fades; own PR with the Playwright e2e harness (2026-10-08)
- [ ] **HIGH** MVP (`dev-docs/SCOPE.md`) — interactive mockup of import → auto slideshow → player first; then slideshow JSON schema (incl. music), engine, UI (2026-10-08)
- [ ] Set the picture duration with music too, aligned to the beat — with music the user still chooses e.g. "about 5 s"; each change snaps to the nearest beat (ADR-0021), the slideshow lasts as long as its pictures and a longer song fades out automatically (ADR-0009); builds on beat sync, mockup first (2026-10-11)
- [ ] Several songs per slideshow — a playlist: data model, music editor, transitions between songs, exports; own feature, mockup first (2026-10-11)
