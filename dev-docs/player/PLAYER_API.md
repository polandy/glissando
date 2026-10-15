# Player API

`createPlayer(container, slideshow, { webGl2Context?, openPicture?, picturesAhead? })` fills a
positioned `container` and returns a `SlideshowPlayer`, modelled on an HTML video element. Options:

- `openPicture(src): Promise<Blob>` reads a slide's picture when the player loads it, so
  `image.src` can be a key such as a stored media id. Each blob gets an object URL for its
  decode, revoked when the picture is released or fails to decode. Without it, `src` is a URL.
- `webGl2Context(canvas)` supplies the WebGL2 context; `null` selects the DOM fallback.
- `readVideo(src): Promise<Blob>` reads a video slide's clip when the player opens it (`video.src`
  can then be a media id); the object URL lives until the clip is released. Without it, `src` is a URL.
- `picturesAhead` is how many slides are loaded beyond the last one on screen, 1 without it.

`createBrowserPlayer` (`src/player/browser-player.ts`) is the same with a required
`startDecodeWorker`: the exported web page starts the decode worker from a script inside itself
(HTML_EXPORT.md). Its `mainThreadDecodeFallback` wraps the worker decoder in a
`FallbackPictureDecoder`: once the worker fails a picture that the main thread decodes, or cannot
start, every decode runs on the main thread; a picture both fail is broken and rejects with an
`AggregateError` of both errors. Once disposed it decodes nothing more on the main thread. The app
keeps the worker alone, so a broken picture is never decoded twice. It and its callers import the
engine's modules directly, never the index, whose `createPlayer` would bring the worker in as a
separate file.

`createFramePlayer(slideshow, size, openPicture?, openVideoFrames?)` is the video export's: a silent player on a
canvas in no document, drawn with WebGL2 at exactly `size` (pixel ratio 1, drawing buffer
preserved for `new VideoFrame(canvas)`), with `captionFontLoaded` and `cardFontsLoaded` (settled at
once without a card) to await before the first `renderAt`, and `dispose()`, which destroys the
player and loses the WebGL context on purpose, since a page holds only a few; `null` without
WebGL2. It never plays a `<video>`: `openVideoFrames(src): VideoFrameSource` supplies a video
slide's frames, one `frameAt(clipMs)` per `renderAt`, so the export can inject frame-accurate
decoded frames (a `TexImageSource`); without it a video slide draws its poster.

Video slides (VIDEO_SLIDES.md) play through the optional `PlayerDependencies.openVideo(src,
volume): VideoPlayback` port (`seek`, `play`, `follow`, `pause`, `setVolume`, `frame`,
`onFrameReady`, `dispose`); `createBrowserPlayer` supplies one `<video>` element per clip
(`browser/video-playback.ts`, `browser/open-video.ts`). A refused clip is a `VideoPlaybackError` in
an `error` event, and the show pauses, like a refused music start.

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

- **Music** follows the player, one playback per track (`PlaylistMusic`; in the browser one audio
  element each). A track sounds while play time is in `[atMs, atMs + endMs − startMs)`, at
  `startMs + (t − atMs)` in the track: on play and after a seek every track heard at that moment
  starts there, and one whose place play time reaches starts on that frame; every sounding track
  pauses on pause, while waiting and at the end, and a track pauses once play time passes its end
  while the others play on. In a crossfade two sound at once. On play, every track not heard then
  is primed: started at its `startMs` at volume 0 and paused again at once, so it starts on loaded
  sound and, on iOS, counts as started in the Play gesture. Each track's volume is a pure function
  of play time (`trackGainAt`: linear fades, silent outside the track), set before every start
  and on every frame, so pause, resume and seek land on every envelope without a jump. The volume
  is set on a Web Audio gain node per element at the context's current time (`MusicOutput`, one
  `AudioContext` per page that every track routes through), since iOS ignores a media element's
  `volume`; without Web Audio it falls back to the element's volume. iOS lets the context sound
  only when it is resumed synchronously in a user gesture, and lets a media element play outside
  a gesture (a track reaching its place on a frame) only once it has played inside one, hence the
  priming: the app unlocks the context in the Play tap that opens the player, in the player's
  play control, and every `play()` of a track unlocks it too. A refused `play()` of any track is
  an `error` and pauses; a start interrupted by a pause (a quick seek) is not a refusal.
- **Pictures** are loaded for the slides on screen plus the next `picturesAhead`; all others are
  released, so memory stays bounded. When a frame needs a picture that is not loaded yet, time
  stops, `waiting` fires, and playback goes on from the same moment with `playing`.
- A picture that fails to load or open is an `error` (`SlideshowLoadError`) and pauses.
- `play()` after the end starts from the beginning.
