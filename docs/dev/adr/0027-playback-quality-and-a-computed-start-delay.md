# ADR-0027: Server slideshows play in 1440 or 4K; 4K waits for a computed share of the pictures

**Status:** accepted; the pictures are prepared a few at a time since ADR-0058, which restates the plan in rounds

## Context

Server slideshows play Immich's preview, three pictures ahead (ADR-0018): it is ≤ 1440 px on
its short edge, so a slideshow is soft on a 4K TV. The original is sharp but large (40 MP,
25 MB): fetched over a phone's or TV's Wi-Fi and made into the display rendition on the device
(the import's decode, bounded to 3840 × 2160), one takes 3–7 s, often longer than a slide is
shown. A fixed lookahead then stalls at nearly every picture. Raising Immich's preview to 2160
fixes the sharpness for everyone, but costs the owner a re-run of Immich's thumbnail job and
twice the preview storage, and is outside the app.

## Decision

- **A per-device setting "Quality of server slideshows"**: Automatic (the default), 1440 pixels,
  4K. Automatic plays 4K only on a screen whose short edge in device pixels (screen size ×
  `devicePixelRatio`) is at least the 4K rendition's 2160, else 1440. It is shown only where the
  server library is on. Device slideshows are unaffected: they are stored as display renditions.
- **Automatic stops at 2160, not at the preview's 1440**, because decoding an original costs
  frames while a slideshow plays. Measured on a generated 40 MP JPEG (26 MB) in the CI image's
  browsers: Firefox's `createImageBitmap` decodes it on the main thread, from a worker too,
  blocking it for about 280 ms per picture; the whole display rendition takes about 360 ms there.
  Chromium decodes off the main thread; the scale and encode run in a worker (below). Preparing
  runs behind the slides, so a block on the main thread lands in a transition and stutters. A laptop between the
  two (a MacBook Air at 1912) gains at most a third more pixels for it; a 4K screen gains half.
- **1440 is Immich's preview; 4K is the original made into the display rendition on the device**,
  the same path as "Keep a copy on this device" — no change to Immich.
- **The display rendition is made in a worker** (`WorkerPictureRenditions`, which every Immich
  read goes through), falling back to the main thread only when the worker cannot be started,
  crashed or failed a picture. On the main thread, Chromium's JPEG encode of the 4K rendition
  (`OffscreenCanvas.convertToBlob`) held it for each picture: a CPU profile of a 4K server
  slideshow of 24 MP originals put 2.8 s of its 2.9 s of long tasks in 30 s there, a frame of up
  to 300 ms at a 4× slower CPU, about 60 ms at full speed.
- **The player prepares before it plays.** It prepares the first two pictures as playing needs
  them (fetch and, for 4K, decode and re-encode), timing each with an injected clock, and keeps
  refining the time per picture t as a moving average over the last four. Pictures are prepared
  one after another; picture i is ready after (i + 1) · t and shown at the start delay D plus its
  slide's start sᵢ, so

  D = t + 1.2 · max(0, maxᵢ (i · t − sᵢ)), pictures to prepare first = min(N, max(1, ⌈D / t⌉))

  — for even slides t + (N − 1) · max(0, t − t_slide) · 1.2. The 1.2 is reserve for a Wi-Fi whose
  speed varies (`PRELOAD_SAFETY_FACTOR`). Per-slide starts, not the average slide length, so a
  run of short slides (music-timed ones) is covered. When a picture is ready faster than it is
  shown (typical for 1440), playing starts right after measuring. The prepare screen offers
  "Start now" and, for 4K, "Play in 1440" for this playback only.

- **Prepared pictures are kept as encoded renditions, not decoded bitmaps**, in a cache keyed by
  picture id and bounded to 60 (`PREPARED_PICTURES_LIMIT`); preparing goes on in order behind the
  slides, and a picture's rendition is released once its slide has passed. The player opens its
  pictures from this cache; one asked for out of order (a seek) is prepared next.

## Options weighed

- **The fixed three-picture lookahead with 4K renditions** — no wait before the start, but the
  lookahead drains within a few slides whenever a picture takes longer than a slide, and playing
  then stalls at nearly every picture.
- **A longer fixed lookahead** — one number cannot fit a slideshow of 20 and one of 300, a fast
  wired TV and a phone on a weak Wi-Fi; too short stalls, too long makes everyone wait.
- **Cache decoded bitmaps** — no decode when the slide comes, but a 4K bitmap is 33 MB in memory
  against 1–2 MB as a JPEG; a dozen would exhaust a TV browser.
- **Automatic above the preview's 1440** — sharper on laptops and tablets, but those then decode
  every original during playback and stutter (Firefox most); the gain there is at most a third.
- **More prepare-ahead headroom** — moves waiting, not the decode: preparing still runs while
  slides play, and holding everything ahead before the start meets the 60-rendition bound.
- **Immich's fullsize rendition** — for a JPEG, Immich redirects it to the original, so the
  decode is the same.
- **Only the Immich 2160 preview** — sharp and instant, but outside the app, costs Immich storage
  and a full thumbnail job, and leaves the default setup soft on a TV.

## Consequences

- 4K on a TV works without changing Immich, at the cost of a wait before the start that grows
  with the slideshow's length and the Wi-Fi's slowness; the screen says how long, and "Start
  now" or "Play in 1440" skip it.
- Every server picture now goes through the prepare flow, also in 1440: one at a time instead of
  three parallel downloads. A preview usually takes well under a slide, so this shows only as the
  brief measuring screen.
- On a laptop or tablet, Automatic plays Immich's preview, scaled up at most a third; "Large"
  still picks 4K by hand, and in Firefox it may stutter while originals are decoded.
- Memory holds at most 60 renditions; a slideshow needing more than that ahead may wait mid-way
  with the player's existing waiting state.
- Shared links (ADR-0025) still play Immich's preview; for them, the Immich 2160 preview remains
  the way to 4K.
