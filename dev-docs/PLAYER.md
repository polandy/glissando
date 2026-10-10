# Player engine

`src/player/` plays a slideshow: framework-free TypeScript plus WebGL2, never importing Svelte
(CODING_PRINCIPLES §7). The app imports only `src/player/index.ts`.

## Slideshow JSON

The wire contract shared by player, app and server. `parseSlideshow` validates untrusted JSON
and throws `SlideshowFormatError` naming the path, the bad value and what to set; unknown keys
are rejected.

```json
{
  "formatVersion": 2,
  "title": "July 2025",
  "music": {
    "src": "music/summer.mp3",
    "startMs": 12000,
    "endMs": 150000,
    "fadeInMs": 2000,
    "fadeOutMs": 2000
  },
  "slides": [
    {
      "image": { "src": "pictures/1.jpg", "capturedAt": "2025-07-01T10:00:00Z" },
      "durationMs": 5000,
      "kenBurns": {
        "from": { "zoom": 1, "centerX": 0.5, "centerY": 0.5 },
        "to": { "zoom": 1.2, "centerX": 0.4, "centerY": 0.6 },
        "easing": "ease-in-out"
      },
      "caption": "Evening on the jetty",
      "transitionToNext": { "effect": "crossfade", "durationMs": 1000 }
    }
  ]
}
```

- **Order**: slides play in array order, which starts as capture order (`capturedAt`) and follows
  the user's reordering. `music` is optional.
- **Durations** are positive whole milliseconds.
- **Ken Burns**: a framing is `zoom` (≥ 1, where 1 is crop-to-fit) and a centre in picture
  coordinates (0..1 from the top left). It is independent of the screen's aspect ratio. Near
  an edge the crop stops at the picture's border. Easings: `linear`, `ease-in`, `ease-out`,
  `ease-in-out` (cubic).
- **Transitions**: `crossfade`, `push-left`, `wipe-right`, `circle-open`, `zoom-in`,
  `dissolve`. A missing `transitionToNext` is a hard cut; the last slide has none.
- **Caption** (optional): one line of 1 to 80 characters (counted in graphemes, so an emoji, a
  flag or a letter with a combining mark is one) without leading, trailing or repeated
  whitespace, as `normalizeCaption` leaves typed text; absent means none. Anything else is a
  `SlideshowFormatError` at `slides[i].caption`.
- **Music** (version 2, ADR-0009): `startMs` is where in the track the slideshow's start falls,
  `endMs` where the music stops being heard, `fadeInMs` and `fadeOutMs` ramp the volume up from
  `startMs` and down to `endMs` (0: none); all whole milliseconds of the track, `endMs` after
  `startMs`, the two fades together at most `endMs − startMs`. The composer resolves them: the
  player knows no "automatic" and no "whole track". A version 1 slideshow is still read; its
  `music`, `{ src }` only, plays as the whole track without fades (`endMs` absent).

## Timing

A transition runs during the **last `durationMs` of the slide carrying it**, so a slideshow
lasts exactly the sum of its slide durations (ADR-0002). The incoming slide's Ken Burns starts
with the transition and ends with its own slide. Transitions are eased `ease-in-out`.

The Ken Burns path (`cropAt` in `ken-burns.ts`) first holds the start and end frames inside the
picture — each crop stopped at the picture's border, its centre moved with it — and then runs
between those two crops: zoom and centre interpolated by the slide's easing. The crop's width
(crop-to-fit ÷ zoom) never exceeds the straight line between the end frames' widths, so a path
whose ends fit stays inside the picture all the way and never reaches a border on the way: no
edge stops the motion part-way, which would show as a sudden change of pan speed or direction.
The renderers and the picture editor's preview and playhead all draw this path. E2E-031 plays
a motion that starts past a picture's edge and checks, frame by seeked frame, that the view's
centre moves one way only.

Show time follows the clock from an anchor set when playing starts or resumes, **after** that
first frame is drawn, so the time it takes never shows as a jump in the motion. While playing,
every animation frame is drawn first, then `SlideRenderer.prepare` is called for each buffered
picture after the ones on screen: a bounded step of the work to draw it later, so the frame a
picture comes on screen pays nothing for it (ADR-0014).

## Player API

`createPlayer(container, slideshow, { webGl2Context?, openPicture? })` fills a positioned
`container` and returns a `SlideshowPlayer`, modelled on an HTML video element. Options:

- `openPicture(src): Promise<Blob>` reads a slide's picture when the player loads it, so
  `image.src` can be a key such as a stored media id. Each blob gets an object URL for its
  decode, revoked when the picture is released or fails to decode. Without it, `src` is a URL.
- `webGl2Context(canvas)` supplies the WebGL2 context; `null` selects the DOM fallback.

`createBrowserPlayer` (`src/player/browser-player.ts`) is the same with a required
`startDecodeWorker`: the exported web page starts the decode worker from a script inside itself
(HTML_EXPORT.md). Its `mainThreadDecodeFallback` wraps the worker decoder in a
`FallbackPictureDecoder`: once the worker fails a picture that the main thread decodes, or cannot
start, every decode runs on the main thread; a picture both fail is broken and rejects with an
`AggregateError` of both errors. Once disposed it decodes nothing more on the main thread. The app
keeps the worker alone, so a broken picture is never decoded twice. It and its callers import the
engine's modules directly, never the index, whose `createPlayer` would bring the worker in as a
separate file.

`createFramePlayer(slideshow, size, openPicture?)` is the video export's: a silent player on a
canvas in no document, drawn with WebGL2 at exactly `size` (pixel ratio 1, drawing buffer
preserved for `new VideoFrame(canvas)`), with `captionFontLoaded` to await before the first
`renderAt`, and `dispose()`, which destroys the player and loses the WebGL context on purpose,
since a page holds only a few; `null` without WebGL2.

The player:

- `play()`, `pause()`, `currentTime` (seconds, settable to seek, clamped), `duration`,
  `paused`, `ended`, `ready` (first frame shown), `error`.
- `renderAt(seconds): Promise<void>` (paused only, for the video export): pauses, moves to
  `seconds` (clamped), waits until that frame's pictures are loaded, draws it, prepares the
  upcoming pictures and resolves; rejects with the load's error, emits no events.
- Events: `canplay`, `play`, `playing`, `waiting`, `pause`, `seeked`, `timeupdate` (every drawn
  frame), `ended`, `error`.
- `captionInset` (CSS pixels, ≥ 0, default 0) lifts every caption from the bottom, e.g. above
  controls laid over the player while they show. Setting it glides the captions there over
  `CAPTION_GLIDE_MS` (300 ms, CSS `ease`; the app fades its controls in the same time), starting
  from where they are mid-glide; the getter returns the target. Each drawn frame takes the
  glide's value at the player's clock: playback frames carry it, and while paused (or waiting)
  the player requests frames of its own until the glide ends, then draws no more.
  `jumpCaptionInset(cssPixels)` sets it at once and redraws, e.g. under reduced motion. A
  `RangeError` refuses a negative or non-finite value. A video export leaves it at 0.
- `redraw()` draws the current frame again; the renderers call it on resize.
- `destroy()` frees pictures, textures, music and the drawing surface.

Behaviour:

- **Music** follows the player: it starts at `startMs` plus `currentTime` on play and after a
  seek, pauses on pause, while waiting, at the end and once play time passes `endMs`, and stays
  silent when played beyond it. Its volume is a pure function of play time (`musicGainAt`:
  linear fades), set before every start and on every frame, so pause, resume and seek land on
  the envelope without a jump. The volume is set on a Web Audio gain node at the context's
  current time (`MusicOutput`, one `AudioContext` per page), since iOS ignores a media element's
  `volume`; without Web Audio it falls back to the element's volume. iOS lets the context sound
  only when it is resumed synchronously in a user gesture: the app unlocks it in the Play tap
  that opens the player, in the player's play control, and every `play()` of the music unlocks
  it too. A refused `play()` is an `error` and pauses; a start interrupted by a pause (a quick
  seek) is not a refusal.
- **Pictures** are loaded for the slides on screen plus the next one; all others are released,
  so memory stays bounded. When a frame needs a picture that is not loaded yet, time stops,
  `waiting` fires, and playback goes on from the same moment with `playing`.
- A picture that fails to load or open is an `error` (`SlideshowLoadError`) and pauses.
- `play()` after the end starts from the beginning.

## Captions

A caption belongs to its slide (ADR-0007): it fades, pushes and wipes with the slide's
transition, but stands still in screen space, unmoved by the Ken Burns motion. Its look
(`caption-layout.ts`, the same numbers for both renderers and the picture editor's preview):

- bottom left over a radial gradient from the bottom-left corner (120 % of the width by 100 % of
  the band, black at 50 % → 18 % at 55 % → clear at 80 %) covering the bottom 42 % of the screen;
- white Instrument Sans 600 at `max(15 CSS px, min(0.042 × height, 0.055 × width))`, line height
  1.22, 1.2 em from the left and 1.1 em from the bottom, a soft shadow;
- lines at most `min(72 % of the width, 34 em)` wide, broken between words (a word too long
  between characters) into at most two lines, the second ending in "…" when the rest does not
  fit (`breakCaption`, pure and measured through an injected `measure`).

## Renderers

- **WebGL2** (default): one shader program per transition, compiled up front;
  `ShaderCompileError` carries the driver's log. The canvas follows its CSS size times the
  device pixel ratio, or keeps a fixed `drawingSize` (the video export's, with pixel ratio 1).
  Its pictures are `ImageBitmap`s decoded in a worker (`BitmapLoader`,
  `WorkerPictureDecoder`, which rejects every decode once its worker could not start, crashed or
  was disposed), upright by their EXIF orientation; a released picture's bitmap is
  closed. Each becomes a mipmapped texture (`picture-textures.ts`), uploaded by `prepare` in
  steps: the storage for the whole mip chain with a first slice of rows, one slice of at most
  `UPLOAD_PIXELS_PER_FRAME` pixels per call, the mipmaps in a call of their own, then the
  caption. Drawing a picture not fully prepared (after a seek) uploads the rest at once
  (ADR-0014).
- **Captions in WebGL**: once the caption font has loaded (`document.fonts.load`, an injected port;
  until then slides draw without captions, then a redraw follows), each loaded slide with a caption
  gets its band, gradient and text, drawn with Canvas 2D at drawing-buffer resolution into a
  premultiplied texture (`caption-textures.ts`), keyed on and released with the slide's picture,
  prepared ahead like the picture, and drawn anew when the viewport, the pixel ratio (browser zoom)
  or the caption changes, and after a restored WebGL context. The transition shaders composite each
  slide's band over its picture in screen space inside `fromColor`/`toColor`, so every effect
  carries it; `captionInset` is a uniform shifting where the band is sampled, so it never redraws
  the texture. A slide without a caption samples a transparent 1×1 texture.
- **Context loss**: on `webglcontextlost` it stops issuing GL calls (`render()` is a no-op, never
  throwing) until `webglcontextrestored`, when it rebuilds its buffers and shader programs, drops
  its texture cache (textures are uploaded anew from the still-held bitmaps when each picture is
  next prepared or drawn), and triggers a redraw of the current frame.
- **DOM fallback** when the browser has no WebGL2: pictures load as `<img>` elements decoded by the
  browser (`ImageElementLoader`), and `prepare` does nothing. Each slide is its `<img>`, framed by a
  CSS transform, followed by its caption element (`[data-caption]`, styled by `captionStyles`)
  outside that transform; every transition becomes a crossfade, the caption fading with its slide.
  Two lines are clamped with CSS.

## Tests

- Pure logic (schema, timeline, Ken Burns, player state) runs as unit tests against
  hand-written fakes: clock, animation frames, picture loader, renderer, music. The fake
  renderer can charge the fake clock for uploads — a whole one for drawing an unprepared
  picture, a slice per `prepare` — so tests bound every frame's step in show time.
- Renderers run as Vitest browser tests (`*.browser.test.ts`) in real engines
  (`scripts/browser-tests.sh`, CI job `e2e`). WebGL output is checked by reading pixels in
  Chromium and WebKit, where the sliced upload is also checked by counting the pixels each
  upload call sends; the worker decode, EXIF orientation included, runs in all three engines.
  Headless Firefox in the CI image has no WebGL, so it tests the DOM fallback
  only.
