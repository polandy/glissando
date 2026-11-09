# ADR-0014: Pictures are decoded in a worker and uploaded in slices before they are needed

**Status:** accepted

## Context

On an iPad the Ken Burns motion held a frame once per picture and then caught up: the motion
follows the clock (`dev-docs/player/TIMING.md`), so any long frame shows as a jump. Measured
in Playwright WebKit with 3840×2160 JPEGs and a frame-by-frame trace of the player:

- The first frame of each transition uploaded the incoming picture: `texImage2D` from the
  `<img>` 22 ms plus `generateMipmap` 7 ms, a 30 ms frame.
- The same frame started decoding the picture after next (`img.decode()`), and WebKit blocked
  the main thread ~105 ms until the decode resolved: the longest gap between frames, 106 ms.
- Playing started the clock before its first frame was drawn, so that frame's upload became a
  jump too.

A benchmark in the same engine: `createImageBitmap(blob)` in a worker does not stall the main
thread; `texSubImage2D` of a 270-row strip from an `ImageBitmap` (with `UNPACK_SKIP_ROWS`, into
`texStorage2D` storage) takes 4–6 ms, `generateMipmap` 3–9 ms, while one whole `texImage2D`
from the `<img>` plus mipmaps takes up to 85 ms. In Chromium, strips from an `<img>` cost 63 ms
each, from an `ImageBitmap` a few — so slices must not come from an `<img>`.

A later trace of a 12-picture 4K show at device pixel ratio 2, reported to stutter in Safari and
Firefox on a MacBook Air, found a strip from an `ImageBitmap` costing 20–39 ms in Playwright
WebKit inside the app (3 ms in an isolated benchmark): a sub-rectangle upload from a bitmap reads
the whole bitmap for every strip. The same strip from a typed array of its own rows takes ~1 ms
in WebKit and well under 1 ms in Chromium.

## Decision

- **Decode in a worker.** The WebGL renderer's pictures are loaded by `PixelLoader`: the bytes
  come from `openPicture` (or `fetch` for a URL `src`), a module worker decodes them with
  `createImageBitmap(…, { imageOrientation: "from-image" })` — upright by EXIF, as an `<img>`
  shows them — draws it onto an `OffscreenCanvas`, reads its RGBA bytes there (`pixelsOf`) and
  transfers them back. Reading from a canvas copy also keeps WebKit from handing decodes
  running at once of equally sized pictures (photos of one camera) each other's bitmaps; a
  decode in a chain inside the worker did not help. A released picture's bytes are left to the
  garbage collector; destroying the player terminates the worker.
- **Upload in slices before the picture is needed.** `SlideRenderer.prepare` does a bounded
  step of the work to draw a picture later. In WebGL: storage for the whole mip chain with a
  first slice, then one slice of at most `UPLOAD_PIXELS_PER_FRAME` (1 Mi pixels, ~4 ms in the
  WebKit benchmark) per call, each uploaded from a view of just its rows' bytes, the mipmaps in a call of their own, then the caption texture.
  While playing, the player calls it after drawing each frame for the buffered pictures after
  the ones on screen. A picture drawn before it is fully prepared — after a seek — uploads the
  rest at once, as before.
- **Start the clock after the first frame.** Playing anchors the show time once its first frame
  is drawn.
- The DOM fallback keeps its `<img>` loader; its `prepare` does nothing.

## Options weighed

- _Upload at first draw_ (the previous state) — simplest, but every picture's first frame pays
  the whole upload, and the decode of the picture after next blocks the main thread in WebKit.
- _Upload the whole picture mid-slide_ — moves the long frame away from the transition but keeps
  it: one 30–85 ms frame per picture still shows as a jump in the motion.
- _Worker decode and sliced upload_ (chosen) — no frame pays more than one slice.

## Consequences

- Two picture loaders and picture types, one per renderer; `createPlayer` picks each renderer
  with its loader.
- A worker per player, and each buffered picture is held decoded as its RGBA bytes (~33 MB for a
  4K picture) besides its texture until released. Its blurred-fill backdrop is shrunk from those
  bytes in JavaScript (`shrinkPixels`, a grid of samples per backdrop pixel), not by a canvas.
- A seek to a picture not yet prepared still draws its first frame late; playing never starts
  its clock before that frame, so it shows as a pause, not a jump.
