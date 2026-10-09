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
- **Caption** (optional): one line of 1 to 80 characters (counted in graphemes, so an emoji, a flag or a
  letter with a combining mark is one) without
  leading, trailing or repeated whitespace, as `normalizeCaption` leaves typed text; absent
  means none. Anything else is a `SlideshowFormatError` at `slides[i].caption`.
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

## Player API

`createPlayer(container, slideshow, { webGl2Context?, openPicture? })` fills a positioned
`container` and returns a `SlideshowPlayer`, modelled on an HTML video element. Options:

- `openPicture(src): Promise<Blob>` reads a slide's picture when the player loads it, so
  `image.src` can be a key such as a stored media id. Each blob gets an object URL for its
  decode, revoked when the picture is released or fails to decode. Without it, `src` is a URL.
- `webGl2Context(canvas)` supplies the WebGL2 context; `null` selects the DOM fallback.

The player:

- `play()`, `pause()`, `currentTime` (seconds, settable to seek, clamped), `duration`,
  `paused`, `ended`, `ready` (first frame shown), `error`.
- Events: `canplay`, `play`, `playing`, `waiting`, `pause`, `seeked`, `timeupdate` (every drawn
  frame), `ended`, `error`.
- `captionInset` (CSS pixels, ≥ 0, default 0) lifts every caption from the bottom, e.g. above
  controls laid over the player while they show. Setting it glides the captions there over
  `CAPTION_GLIDE_MS` (300 ms, CSS `ease`; the app fades its controls in the same time), starting from where they are mid-glide; the getter
  returns the target. Each drawn frame takes the glide's value at the player's clock: playback
  frames carry it, and while paused (or waiting) the player requests frames of its own until the
  glide ends, then draws no more. `jumpCaptionInset(cssPixels)` sets it at once and redraws, e.g.
  under reduced motion. A `RangeError` refuses a negative or non-finite value. A video export
  leaves it at 0.
- `redraw()` draws the current frame again; the renderers call it on resize.
- `destroy()` frees pictures, textures, music and the drawing surface.

Behaviour:

- **Music** follows the player: it starts at `startMs` plus `currentTime` on play and after a
  seek, pauses on pause, while waiting, at the end and once play time passes `endMs`, and stays
  silent when played beyond it. Its volume is a pure function of play time (`musicGainAt`:
  linear fades), set before every start and on every frame, so pause, resume and seek land on
  the envelope without a jump. A refused `play()` is an `error` and pauses; a start
  interrupted by a pause (a quick seek) is not a refusal.
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
  `ShaderCompileError` carries the driver's log. Pictures become mipmapped textures; the
  canvas follows its CSS size times the device pixel ratio.
- **Captions in WebGL**: once the caption font has loaded (`document.fonts.load`, an injected
  port; until then slides draw without captions, then a redraw follows), each loaded slide with
  a caption gets its band, gradient and text, drawn with Canvas 2D at drawing-buffer resolution
  into a premultiplied texture (`caption-textures.ts`), released with the slide's picture and
  drawn anew when the viewport, the pixel ratio (browser zoom) or the caption changes, and after
  a restored WebGL context. The transition shaders composite each
  slide's band over its picture in screen space inside `fromColor`/`toColor`, so every effect
  carries it; `captionInset` is a uniform shifting where the band is sampled, so it never redraws
  the texture. A slide without a caption samples a transparent 1×1 texture.
- **Context loss**: on `webglcontextlost` it stops issuing GL calls (`render()` is a no-op, never
  throwing) until `webglcontextrestored`, when it rebuilds its buffers and shader programs,
  drops its texture cache (textures are re-uploaded lazily from the still-held pictures), and
  triggers a redraw of the current frame.
- **DOM fallback** when the browser has no WebGL2: each slide is its `<img>`, framed by a CSS
  transform, followed by its caption element (`[data-caption]`, styled by `captionStyles`)
  outside that transform; every transition becomes a crossfade, the caption fading with its
  slide. Two lines are clamped with CSS.

## Tests

- Pure logic (schema, timeline, Ken Burns, player state) runs as unit tests against
  hand-written fakes: clock, animation frames, picture loader, renderer, music.
- Renderers run as Vitest browser tests (`*.browser.test.ts`) in real engines
  (`scripts/browser-tests.sh`, CI job `e2e`). WebGL output is checked by reading pixels in
  Chromium and WebKit. Headless Firefox in the CI image has no WebGL, so it tests the DOM fallback
  only.
