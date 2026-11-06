# Writing the file

- **mediabunny** (ADR-0015), loaded on the first export: `Mp4OutputFormat` with a reserved `moov`
  (packet-count upper bounds from the frame count and the audio duration), `StreamTarget`
  writing each piece as it comes into a `FileSystemWritableFileStream`.
- **Target:** where `showSaveFilePicker` exists, "Video erstellen" opens it (user gesture) with
  the suggested name `<title> (1080p).mp4` (`720p`, `4K`). Dismissing it returns to the sheet,
  nothing started. Elsewhere, a file in the origin private file system at
  `video-export/<run id>/<name>`: a folder per run, so two tabs exporting the same title never
  share a file.
- **Space:** before the start (OPFS only), `navigator.storage.estimate()`. When `quota − usage` is
  below the estimated size, a lemon note shows before the start. It does not block, since the
  estimate is rough.
- **Clean-up:** a private run holds the Web Lock `glissando-video-export:<run id>` from before its
  folder exists until the sheet closes, which deletes the folder and frees the lock. On app start,
  every entry under `video-export/` whose lock is free is deleted while holding it: the browser
  frees a crashed or closed tab's locks, while a run still writing or waiting to be shared in
  another tab or the installed app keeps its file. Without Web Locks nothing is swept, so a crash
  may leave a file behind but no export in use is ever lost.
