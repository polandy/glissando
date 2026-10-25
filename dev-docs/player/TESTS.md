# Tests

- Pure logic (schema, timeline, Ken Burns, player state) runs as unit tests against
  hand-written fakes: clock, animation frames, picture loader, renderer, music. The fake
  renderer can charge the fake clock for uploads — a whole one for drawing an unprepared
  picture, a slice per `prepare` — so tests bound every frame's step in show time.
- Renderers run as Vitest browser tests (`*.browser.test.ts`) in real engines
  (`scripts/browser-tests.sh`, CI jobs `vitest (<engine>)`). WebGL output is checked by reading pixels in
  Chromium and WebKit, where the sliced upload is also checked by counting the pixels each
  upload call sends; the worker decode, EXIF orientation included, runs in all three engines.
  Headless Firefox in the CI image has no WebGL, so it tests the DOM fallback
  only.
- A video slide's clip is faked in the unit tests (`testing/fake-videos.ts`: `FakeVideo`,
  `FakeVideos`, `FakeVideoFrames`); the renderers' browser tests draw a canvas as the live frame
  (no encoded fixture), and `browser/video-playback.ts` is tested against a fake element.
- A browser test that plays on real animation frames keeps its frame wholly in view: WebKit runs
  no animation frame in a frame outside the window's viewport, and in a full run Vitest stacks
  each test file's frame below the ones before it.
- A look's grade (`webgl-looks.browser.test.ts`, `dom-looks.browser.test.ts`) is checked by
  reading pixels in WebGL, as the other WebGL tests are; the DOM fallback's filter cannot be
  pixel-read this way — WebKit's Canvas 2D `filter` does not apply a `url(...)` reference to a
  document SVG filter — so it is checked by comparing each picture or video element's `style.filter`
  against the look's own `<filter>` element and its `feColorMatrix`/`feComponentTransfer` values.
- An e2e case that reads the player's frame during playback holds the page's clock
  (`page.clock.install` + `pauseAt`), waits for the dialog to stop being `aria-busy` and moves
  the show with `fastForward` — one frame per jump. Real time never decides what is drawn: under
  CPU load a playing clip can starve the page for seconds, longer than any assertion waits.
