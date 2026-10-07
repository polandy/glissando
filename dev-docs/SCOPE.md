# Scope

Glissando is self-hosted slideshow software for images, videos and other content with
high-quality animation. It is a web app, installable as a PWA, aimed at end users.

## Inspiration

[gre/diaporama](https://github.com/gre/diaporama) (archived 2020). Its core ideas carry over:

- Ken Burns effect on images — configurable zoom/pan _from → to_ with easing.
- GLSL transitions between slides (WebGL, hardware-accelerated) with a DOM/opacity fallback.
- A slideshow is described as JSON.
- A player API modelled on HTML5 video: `play`, `pause`, `currentTime`, events.
- Responsive, any aspect ratio, crop-to-fit, retina-ready.

## Product principles

- **Simple and uncluttered.** Few controls on screen at a time; every screen has one obvious next
  step. A feature that needs a manual is redesigned, not documented.
- **Good by default.** Picking the pictures is enough for a good slideshow: focus-aware Ken Burns,
  varied transitions and sensible timing are chosen automatically. Every automatic choice can be
  overridden in the editor, none has to be. Pictures are ordered by capture date (EXIF
  `DateTimeOriginal`, Immich's date for Immich photos, the file date as a last resort).
- **Fully offline.** With local pictures and music, Glissando works with no network at all:
  every asset (code, fonts, shaders, detection models) ships with the app and is cached by the
  service worker; nothing is fetched from a third party. Only Immich needs its server reachable.
- **Any common audio format.** MP3, AAC/M4A, Ogg/Opus, FLAC, WAV and the like are accepted. The
  browser decodes what it can natively; anything else is converted client-side (WASM decoder) to
  a format every target browser plays, before it enters the slideshow.

## Client first

As much as possible runs in the browser: playback, Ken Burns, transitions, thumbnails, audio
conversion, editing and video export (WebCodecs). Slideshows and media are kept client-side (OPFS/IndexedDB),
which also gives the PWA offline playback. The server stays thin — it serves the app and stores
or syncs slideshows and media; it does no rendering or processing. A feature moves to the server
only when the browser cannot do it, and that move is an ADR.

## PWA

Installable on phone, tablet and desktop, fullscreen, offline playback of cached slideshows.
Service workers need a secure context, so a LAN install is served over HTTPS through a reverse
proxy (Caddy, Traefik, Tailscale); plain `http://<lan-ip>` works as a web app without PWA
features.

## MVP — pictures and music in, a good slideshow out

Usable end to end by a non-technical user, fully offline:

- **Import** pictures (files or a folder) and one music file from the device; stored client-side
  (OPFS/IndexedDB), the slideshow survives a reload.
- **Order** by capture date (see _Good by default_).
- **Automatic Ken Burns** from a simple framing rule (no detection yet).
- **About six GLSL transitions**, varied automatically, with the DOM/opacity fallback.
- **Music**: one track in any format the browser decodes natively; slide timing fits the track's
  length.
- **Player**: fullscreen, play/pause/seek, the HTML5-video-style API over the slideshow JSON
  (which already carries the music track).
- **Minimal editing**: remove and reorder pictures — nothing more.
- **PWA**: installable, works offline.

Not in the MVP: per-slide settings, detection, Immich, video export, audio conversion.

## Roadmap — in this order after the MVP

1. **Editor** — per slide: duration, transition, Ken Burns from/to; music trim and fade.
2. **Automatic focus** — Ken Burns aims at people or the subject; Immich photos use Immich's face
   data, others get on-device detection in the browser.
3. **Immich** — browse and pick albums and photos via the Immich API. Whether the browser calls
   it directly (CORS, API key exposure) or through a thin server proxy is an ADR.
4. **Video export** — the slideshow with its music rendered to a video file in the browser
   (WebCodecs encoding, client-side muxing; muxer choice is an ADR).
5. **Audio formats** — formats the browser cannot decode are converted client-side (WASM
   decoder; choice is an ADR).
6. **Beat sync** — transitions land on the music's beats, detected in the browser.
7. **Culling** — near-duplicate burst shots and blurry pictures are skipped automatically.
8. **Portrait layouts** — two portrait pictures side by side, or one over a blurred fill,
   instead of a hard crop.
9. **Picture frame mode** — an endless, varied slideshow from an album (e.g. Immich) on an old
   tablet or a TV browser.
10. **On the TV, controlled from the phone** — open a slideshow on the TV via link or QR code and
    control it from the phone; the cross-device channel is an ADR.
11. **Videos as slides.**

Each step goes through the UI flow in `CLAUDE.md` (mockup first, owner OK, then specs and code).
