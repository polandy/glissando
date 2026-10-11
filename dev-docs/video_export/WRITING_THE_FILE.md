# Writing the file

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
