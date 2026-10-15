# ADR-0034: A video is a picture that carries a clip, stored as the original and downloaded whole

**Status:** accepted

## Context

Roadmap 12 (`dev-docs/SCOPE.md`) lets a video be a slide. Everything in the library, composer,
editors and exports is built around the stored picture: its order, duration, transition, caption,
colours, focus and thumbnails. Three questions need an answer: how a video is modelled, what is
stored of it, and how it travels from Immich, and why the server keeps none.

## Decision

- **A video slide is a stored picture with an optional `video`** (`StoredVideo`,
  [VIDEO_SLIDES](../player/VIDEO_SLIDES.md)). Its picture is the poster frame at the excerpt's
  start. Order, caption, transition, cards, thumbnails and the blurred fill need no second code
  path; the slideshow JSON gains an optional `video` on a picture slide (format version 7).
- **The original file is stored as chosen**, in its own `videos` object store, never re-encoded. A
  file is accepted when this browser can play it; otherwise it is refused at its tile.
- **A clip is downloaded whole** from Immich (its playable version) and then lives on the device
  like a picture. Nothing is streamed.
- **The server keeps no clip.** A server slideshow links Immich photos and stores no device
  picture (ADR-0018); a clip is as much a device file as a device picture, so a video slide is
  left out where a slideshow is saved on the server, and a share link, being of a server
  slideshow, carries none. Uploading clips would make the server a media store to size, back up
  and collect, which ADR-0018 weighed and rejected for pictures.

## Options weighed

- _A separate `StoredVideo` item beside pictures_ — rejected: every list, order, selection, undo,
  duration and transition rule would need a second branch, and a card or fill would have no picture.
- _Re-encoding to H.264/MP4 on import (WebCodecs or WASM)_ — rejected: minutes of work per clip on a
  phone, a lossy copy, and a second heavy dependency; refusing what the browser cannot play is
  honest and cheap.
- _Streaming from Immich_ — rejected by the owner: offline-first, no stalls at a
  transition, and the clip must be on the device for the exports anyway.

## Consequences

- Videos make the database big; the free-storage check and the `.glissando` size estimate count them.
- A slideshow with video slides lives on the device (or in a `.glissando` file, which carries the clips); the server copy drops them.
- A format the browser cannot play on one device (HEVC) cannot be played there even if it was added on
  another; the player then shows the poster and a notice.
