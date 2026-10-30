# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Investigate the video freeze before a video slide ends (picture holds, sound plays; title slide then video, cropped and not) — not reproducible in headless Chromium with a generated 720p clip; also not on a real desktop GPU (AMD iGPU, Pixel 7 viewport, H.264 720p–4K60 up to 61 Mbit/s, 4× CPU slowdown; probe `scripts/probe-video-freeze.mjs`, 2026-10-30) — parked until it recurs; then note clip codec, resolution, length of audio vs. video track and the Android model, and remote-debug the phone; if a large clip is the cause, cap the live frame size and upload per decoded frame (`dev-docs/player/VIDEO_SLIDES.md`) (2026-10-15)
