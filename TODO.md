# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Fix the rare WebKit stall of the play tests (`page-export`, `share-page` browser tests: state `playing`, time stands at 0:00): not reproducible in ~45 stressed CI runs after the per-engine CI split; the next failure prints a report (animation frames in page and test frame, both frames' places in view, progress) that names the cause — fix it test-first from that (2026-10-11)
- [ ] Investigate the video freeze before a video slide ends (picture holds, sound plays; title slide then video, cropped and not) — not reproducible in headless Chromium with a generated 720p clip; test on another device and note clip codec, resolution and browser; if a large clip is the cause, cap the live frame size and upload per decoded frame (`dev-docs/player/VIDEO_SLIDES.md`) (2026-10-15)
