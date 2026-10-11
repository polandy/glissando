# Rendering

- **Time is the export's.** Frame `n` shows slideshow time `n / 30` s, clamped to the duration;
  frame count `ceil(durationMs × 30 / 1000)`. Its timestamp is `round(n × 10⁶ / 30)` µs, its
  duration the gap to the next. No `requestAnimationFrame`, no wall clock.
- **The player draws it.** `SlideshowPlayer.renderAt(seconds)` (PLAYER.md) waits until that frame's
  pictures are loaded, draws it, prepares the upcoming pictures, then resolves; Ken Burns,
  transitions and captions are exactly the player's. Then `new VideoFrame(canvas, { timestamp,
duration })`, encode, close.
- **The canvas** is an unattached WebGL2 canvas at the preset's size: `WebGlRenderer` with a fixed
  drawing size and pixel ratio 1, `captionInset` 0, the caption font awaited before frame 0. No DOM
  fallback: without WebGL2 the export is unsupported.
- **Backpressure:** before each encode, while `encodeQueueSize` > 2, wait for `dequeue`.
