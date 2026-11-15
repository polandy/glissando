# Code

`src/video-export/` holds pure logic and ports. The browser adapters live in
`src/video-export/browser/`, the sheet in `src/app/screens/slideshow/VideoExportSheet.svelte` with
its states' parts in `screens/slideshow/video-export/` and the parts it shares with the web page
export in `screens/slideshow/export-sheet/`. `src/app/video-export/` drives it:
`video-export-session.ts` (the sheet's flow over the ports and states in `export-sheet-state.ts`,
unit-tested with fakes), `screen-awake.ts` (the wake lock), `slideshow-video-export.ts` (composes
the stored slideshow for the run) and `browser-video-export-device.ts` (the browser ports, wired by `main.ts`).

- `plan.ts`: presets, frame count, timestamps, keyframes, size estimate, packet-count bounds.
- `export-video.ts`: the run, which owns the frame loop, interleaving, backpressure, progress,
  cancel (an `AbortSignal`) and error mapping (`QuotaExceededError` → storage-full). Its ports:
  `FrameSource`, `VideoEncoderPort`, `AudioSource`, `AudioEncoderPort`, `MuxerPort`, `FileSink`,
  `Clock`.
- `clip-audio-plan.ts`, `duck-ramps.ts`, `clip-check.ts`: the video slides' sound and decodability
  as pure functions; `browser/clip-frames.ts`, `clip-sound.ts`, `clip-support.ts` read clips
  with mediabunny (`VIDEO_SLIDES.md`).
- Tests: units against fakes of every port, with no browser and no timing. A browser test exports a
  small generated slideshow in each engine and reads the MP4 back with mediabunny's reader (duration,
  frame count, audio track). E2E-030 runs the sheet from the info panel to "done" at 720p,
  downloads the file and reads it back (name, `ftyp`, size, both tracks' duration); Chromium
  only, since Playwright's Firefox encodes no preset and its WebKit has no origin private file
  system.
  All test pictures are generated or public domain.
