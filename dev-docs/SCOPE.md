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
  overridden in the editor, none has to be.

## Client first

As much as possible runs in the browser: playback, Ken Burns, transitions, thumbnails, and later
editing and video export (WebCodecs). Slideshows and media are kept client-side (OPFS/IndexedDB),
which also gives the PWA offline playback. The server stays thin — it serves the app and stores
or syncs slideshows and media; it does no rendering or processing. A feature moves to the server
only when the browser cannot do it, and that move is an ADR.

## PWA

Installable on phone, tablet and desktop, fullscreen, offline playback of cached slideshows.
Service workers need a secure context, so a LAN install is served over HTTPS through a reverse
proxy (Caddy, Traefik, Tailscale); plain `http://<lan-ip>` works as a web app without PWA
features.

## Milestones

1. **Player (MVP)** — JSON in, playback out: Ken Burns, a set of GLSL transitions with fallback, a music
   track played in sync with the timeline, the HTML5-video-style control API and a minimal
   control bar.
2. **Editor** — add and order images, configure each slide's effect (Ken Burns from/to,
   transition, duration) and choose the music; edits the same JSON the player plays.
3. **Automatic focus** — detect people or the image's subject and aim Ken Burns at it. Photos
   from Immich use Immich's face data; others get on-device detection in the browser.
4. **Immich** — browse and pick albums and photos from an Immich library via its API.
5. **Later** — video export (WebCodecs), videos and other content as slides.
