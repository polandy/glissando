# Video slides in the export

Contract: `player/VIDEO_SLIDES.md`, ADR-0035. `runVideoExport` takes `openVideo(src)`, which reads
a clip's file by a video slide's `src`; the app passes `LibraryStore.videoBlob`.

- **Frames.** The export's frame player gets a `VideoFrameSource` per clip (`ClipFrames`), so a
  video slide is drawn from the exact frame of `startMs + slide time`, never from a playing
  element. `ClipFrames` reads the `Blob` through mediabunny's `BlobSource`, asks a `CanvasSink`
  for the last frame at or before the time (before the first frame, the first one holds) and
  decodes no wider than the preset's frame. Only that frame is decoded and the canvases come from a
  pool of two, so memory never holds a decoded clip. The clip is opened on the first request and
  closed when the player is disposed.
- **Sound.** Every video slide with volume above 0 is mixed in the same segment's
  `OfflineAudioContext` as the music (`AudioMixer`). `ClipSound` pulls the excerpt's audio
  buffers for the segment's window from an `AudioBufferSink` and starts each where
  `placeClipBuffer` puts it, through a gain at the clip's volume; so a clip's sound is decoded
  one window at a time too. A clip without a sound track adds nothing.
- **Ducking.** The music goes through one more gain whose automation is `duckGainRamps`, the
  linear pieces of the player's own `duckFactorAt` over the segment, so the ramps and the 35 %
  plateau are the player's exactly; the music's trim and fades multiply on top.
- **Audio track.** The file gets one when there is music or a clip with sound
  (`exportHasAudio`); the codec probe and the size estimate take that, not the music alone.
- **Duration and size.** A video slide's length is its excerpt (a fixed duration), so the
  frame count and the estimate already include it.
- **Up-front check.** `firstUndecodableClip` (pure, over the port `canDecodeClip`) names the first
  clip this browser cannot decode when the sheet opens (`CAPABILITIES.md`).
- **Tests.** Units for the ramps, placement and check; a browser test (Chromium and WebKit)
  generates a real clip with the engine's own export, decodes its frames and sound, ducks music
  under it and exports a show containing it. WebKit's AAC encoder stamps every packet 0, so the
  sound assertions skip there. Firefox has no WebGL2 in the CI image and skips the file.
