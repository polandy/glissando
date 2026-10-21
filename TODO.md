# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Investigate the video freeze before a video slide ends (picture holds, sound plays; title slide then video, cropped and not) — not reproducible in headless Chromium with a generated 720p clip; test on another device and note clip codec, resolution and browser; if a large clip is the cause, cap the live frame size and upload per decoded frame (`dev-docs/player/VIDEO_SLIDES.md`) (2026-10-15)
- [ ] Let the owner re-run the focus detection on stored pictures — a picture keeps the focus found when it was added (also "none"), so existing slideshows never gain a better detection such as the object detection (ADR-0012, ADR-0036) (2026-10-20)
- [ ] Run the on-device focus pass over server slideshows too — today only the device store gets one, so a server picture without Immich faces aims at the middle; needs a second FocusPass in `src/main.ts`, the found focus stored on the Glissando server (endpoint + `library-repository.ts`) instead of per session, and Immich's preview size rather than the ~250 px thumbnail (ADR-0012, ADR-0013) (2026-10-21)
