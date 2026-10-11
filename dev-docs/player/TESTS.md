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
- A browser test that plays on real animation frames keeps its frame wholly in view: WebKit runs
  no animation frame in a frame outside the window's viewport, and in a full run Vitest stacks
  each test file's frame below the ones before it.
