# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] **HIGH** Player MVP — interactive mockup of the player and its control bar first, then slideshow JSON schema (incl. music track), engine, UI (2026-10-08)
- [ ] Editor — images, per-slide effect (Ken Burns, transition, duration), music; mockup first (2026-10-08)
- [ ] Automatic focus — Ken Burns aims at detected people/subject; Immich face data first, on-device detection otherwise (2026-10-08)
- [ ] Immich source — pick albums/photos via the Immich API; check whether the browser can call it directly (CORS, API key exposure) or a thin server proxy is needed → ADR (2026-10-08)
- [ ] Good defaults — picking photos alone yields a good slideshow (focus, varied transitions, timing) (2026-10-08)
- [ ] Capture-date order — default sort by EXIF/Immich capture date, file date as fallback (2026-10-08)
- [ ] Audio formats — accept common formats; decode natively, convert the rest client-side (WASM); pick the decoder → ADR (2026-10-08)
- [ ] Fully offline — service worker precaches every asset; no third-party request; offline e2e case (2026-10-08)
- [ ] Video export — WebCodecs + client-side muxing, with music; pick the muxer → ADR (2026-10-08)
- [ ] Logo: app icon's cards sit left of centre — check with the owner (2026-10-08)
