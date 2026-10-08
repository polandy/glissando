# Player engine

`src/player/` plays a slideshow: framework-free TypeScript plus WebGL2, never importing Svelte
(CODING_PRINCIPLES §7). The app imports only `src/player/index.ts`.

## Slideshow JSON

The wire contract shared by player, app and server. `parseSlideshow` validates untrusted JSON
and throws `SlideshowFormatError` naming the path, the bad value and what to set; unknown keys
are rejected.

```json
{
  "formatVersion": 1,
  "title": "July 2025",
  "music": { "src": "music/summer.mp3" },
  "slides": [
    {
      "image": { "src": "pictures/1.jpg", "capturedAt": "2025-07-01T10:00:00Z" },
      "durationMs": 5000,
      "kenBurns": {
        "from": { "zoom": 1, "centerX": 0.5, "centerY": 0.5 },
        "to": { "zoom": 1.2, "centerX": 0.4, "centerY": 0.6 },
        "easing": "ease-in-out"
      },
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

## Timing

A transition runs during the **last `durationMs` of the slide carrying it**, so a slideshow
lasts exactly the sum of its slide durations (ADR-0002). The incoming slide's Ken Burns starts
with the transition and ends with its own slide. Transitions are eased `ease-in-out`.

## Player API

`createPlayer(container, slideshow)` fills a positioned `container` and returns a
`SlideshowPlayer`, modelled on an HTML video element:

- `play()`, `pause()`, `currentTime` (seconds, settable to seek, clamped), `duration`,
  `paused`, `ended`, `ready` (first frame shown), `error`.
- Events: `canplay`, `play`, `playing`, `waiting`, `pause`, `seeked`, `timeupdate` (every drawn
  frame), `ended`, `error`.
- `redraw()` draws the current frame again; the renderers call it on resize.
- `destroy()` frees pictures, textures, music and the drawing surface.

Behaviour:

- **Music** follows the player: it starts at `currentTime` on play and after a seek, pauses on
  pause, while waiting and at the end. A refused `play()` is an `error` and pauses.
- **Pictures** are loaded for the slides on screen plus the next one; all others are released,
  so memory stays bounded. When a frame needs a picture that is not loaded yet, time stops,
  `waiting` fires, and playback goes on from the same moment with `playing`.
- A picture that fails to load is an `error` (`SlideshowLoadError`) and pauses.
- `play()` after the end starts from the beginning.

## Renderers

- **WebGL2** (default): one shader program per transition, compiled up front;
  `ShaderCompileError` carries the driver's log. Pictures become mipmapped textures; the
  canvas follows its CSS size times the device pixel ratio.
- **DOM fallback** when the browser has no WebGL2: each slide is its `<img>`, framed by a CSS
  transform; every transition becomes a crossfade.

## Tests

- Pure logic (schema, timeline, Ken Burns, player state) runs as unit tests against
  hand-written fakes: clock, animation frames, picture loader, renderer, music.
- Renderers run as Vitest browser tests (`*.browser.test.ts`) in real engines
  (`scripts/browser-tests.sh`, CI job `e2e`). WebGL output is checked by reading pixels in
  Chromium and WebKit. Headless Firefox in the CI image has no WebGL, so it tests the DOM fallback
  only.
