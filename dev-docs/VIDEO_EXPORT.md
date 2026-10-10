# Video export

The slideshow with its music rendered to an MP4 on the device, frame by frame, offline
(roadmap 4, ADR-0015). Approved mockup: https://polandy.github.io/glissando-assets/mockups/video-export/.

## Presets

16:9, 30 frames per second, a keyframe every 2 s (60 frames), `hardwareAcceleration: "no-preference"`.

| Preset (id)          | Size        | Video codec   | Video bitrate | Label (de / en)                                                  |
| -------------------- | ----------- | ------------- | ------------- | ---------------------------------------------------------------- |
| Klein / Small (720p) | 1280 × 720  | `avc1.640028` | 4 Mbit/s      | Zum Verschicken / For sending                                    |
| Standard (1080p)     | 1920 × 1080 | `avc1.640028` | 8 Mbit/s      | Für Rechner, Telefon und Tablet / For computer, phone and tablet |
| Groß / Large (4k)    | 3840 × 2160 | `avc1.640033` | 24 Mbit/s     | Für den Fernseher / For the TV                                   |

Audio: AAC-LC (`mp4a.40.2`), 48 kHz, stereo, 160 kbit/s; where `AudioEncoder` refuses that, Opus
(`opus`) with the same values. A slideshow without music has no audio track.

The size shown beside a preset is `(video + audio bitrate) × duration / 8`, "ca. 347 MB".

## Capabilities

When the sheet opens, the export asks the browser, never a user-agent string:

- `VideoEncoder.isConfigSupported` for each preset's exact config; a refused preset is greyed out
  with "Kann dieses Gerät nicht kodieren". The default is 1080p, else the largest available.
- `AudioEncoder.isConfigSupported` for AAC, then Opus.
- Unsupported as a whole (the sheet explains only, no presets): no `VideoEncoder`, no WebGL2, no
  preset available, or music but neither AAC nor Opus. Copy: "Dieser Browser kann keine Videos
  erstellen. Dafür braucht Glissando WebCodecs. Es geht in aktuellem Chrome, Edge, Firefox und
  Safari (auch auf iPhone und iPad)."

## Rendering

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

## Music

- The music's bytes are decoded once (`decodeAudioData`), then rendered in 30 s segments, each in its
  own `OfflineAudioContext` (2 channels, 48 kHz): the source starts at `startMs / 1000` plus the
  segment's start, and its gain follows `musicGainAt` (ADR-0009) as linear ramps between the fade
  boundaries. So the export holds the decoded track plus one segment, never the whole mix.
- The audio track is exactly as long as the video; after the audible end it is silence.
- Each segment goes to the `AudioEncoder` as `f32-planar` `AudioData` once the video reaches the
  segment's start, so the muxer gets both tracks interleaved.

## Writing the file

- **mediabunny** (ADR-0015), loaded on the first export: `Mp4OutputFormat` with a reserved `moov`
  (packet-count upper bounds from the frame count and the audio duration), `StreamTarget`
  writing each piece as it comes into a `FileSystemWritableFileStream`.
- **Target:** where `showSaveFilePicker` exists, "Video erstellen" opens it (user gesture) with
  the suggested name `<title> (1080p).mp4` (`720p`, `4K`). Dismissing it returns to the sheet,
  nothing started. Elsewhere, a file in the origin private file system under `video-export/`.
- **Space:** before the start (OPFS only), `navigator.storage.estimate()`. When `quota − usage` is
  below the estimated size, a lemon note shows before the start. It does not block, since the
  estimate is rough.
- **Clean-up:** the OPFS file is deleted when the sheet closes. On app start, the `video-export/`
  folder is emptied, which covers a crash.

## Sheet

"Video" (film icon) in the info panel's "Speichern als" row below "Play", beside "Webseite"
(HTML_EXPORT.md), opens `VideoExportSheet`: a dialog on desktop, a bottom sheet below 720 px. The
button's accessible name is "Als Video sichern". The sheet's frame (`export-sheet/ExportDialog`),
size radios, file row and saved note are shared with the web page export.

| State        | Content                                                                                                                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| choose       | Title "Als Video sichern", subtitle "<title> · <duration> · mit Musik"; three preset radios with size; chips `MP4 · H.264 · AAC/Opus · 30 Bilder/s`; Opus note (lemon); space note (lemon); hint "Glissando rechnet jedes Bild einzeln …"; Abbrechen / Video erstellen |
| running      | The last encoded frame as a preview with "2:15 / 5:40"; a mint progress bar; "Bild 4.067 von 10.200"; "noch etwa 3:24" (elapsed per frame × frames left, from an injected clock); only "Abbrechen"                                                                     |
| done         | File row (thumbnail, name, size, duration, resolution). With the picker: mint "Gespeichert", "Fertig". With `navigator.canShare({ files })`: "Teilen …" (share sheet). Otherwise "Herunterladen". Plus "Schließen"                                                     |
| storage-full | Coral note: at which frame space ran out, the partial file deleted, how much is missing; "Andere Größe wählen" (back to choose, 720p selected) / "Schließen"                                                                                                           |
| failed       | Coral note with the error; "Schließen"                                                                                                                                                                                                                                 |
| unsupported  | The capability copy above; "Schließen"                                                                                                                                                                                                                                 |

- While running, the screen is kept awake (`navigator.wakeLock`, requested again on
  `visibilitychange` when visible). A hidden page pauses the work, which the export's own time
  makes harmless.
- "Abbrechen" stops at once: the encoders are closed, the muxer aborts the writable, and the
  OPFS file is deleted. With the picker, only the writer is aborted: File System Access writes
  into a swap file that only `close()` commits, so a file the user chose to overwrite keeps its
  old content and a new name stays the empty file the picker created, which a browser cannot
  delete.
- One export at a time; the sheet is modal while running. While running, ✕ reads "Abbrechen"
  and Esc cancels too; a tap on the scrim closes the sheet only where nothing is lost (not while
  running, not once done). Closed, focus goes back to "Video".
- While the browser is being probed, the sheet shows "Glissando prüft, was dieses Gerät kann …".
  A probe or a target that fails shows as failed.
- Below the done file row: with "Teilen …" the hint on the share menu, with "Herunterladen"
  "Schließen löscht die Kopie in Glissando; vorher herunterladen." A dismissed share sheet is no
  error.
- A refused wake lock (e.g. battery saver) is logged; the export runs on without it.

## Code

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
- Tests: units against fakes of every port, with no browser and no timing. A browser test exports a
  small generated slideshow in each engine and reads the MP4 back with mediabunny's reader (duration,
  frame count, audio track). E2E-030 runs the sheet from the info panel to "done" at 720p,
  downloads the file and reads it back (name, `ftyp`, size, both tracks' duration); Chromium
  only, since Playwright's Firefox encodes no preset and its WebKit has no origin private file
  system.
  All test pictures are generated or public domain.
