# ADR-0015: Video export writes H.264/AAC MP4 with mediabunny, streamed to a file

**Status:** accepted

## Context

Roadmap 4 (`dev-docs/SCOPE.md`): the slideshow with its music rendered to a video file in the
browser, offline, with WebCodecs encoding and client-side muxing. The file has to play where people
watch it: iPhone and iPad (Photos, Files), TVs over USB or DLNA, any computer. A one-hour 4K
slideshow is several GB, which a phone cannot hold in memory.

Measured in the pinned Playwright image (`mcr.microsoft.com/playwright` v1.63.0, Linux, no GPU),
2026-10-10, with `isConfigSupported` and a real trial encode of each:

| Engine       | H.264 (High, to 4K at level 5.1) | HEVC | VP9 / AV1 | AAC-LC | Opus | WebGL2 on OffscreenCanvas in a worker | `showSaveFilePicker` |
| ------------ | -------------------------------- | ---- | --------- | ------ | ---- | ------------------------------------- | -------------------- |
| Chromium 153 | yes                              | no   | yes       | no     | yes  | yes                                   | yes                  |
| Firefox 155  | yes                              | no   | yes       | no     | yes  | no                                    | no                   |
| WebKit 26.6  | yes                              | yes  | yes       | yes    | yes  | no                                    | no                   |

Every engine has `VideoEncoder`, `AudioEncoder`, `OfflineAudioContext` and the origin private file
system with `createWritable`. No `isConfigSupported` answer was contradicted by the trial encode.
This is a lower bound. Chrome and Edge on Windows, macOS and Android encode AAC through the
operating system, which Linux builds do not. Safari on the iPad was measured with the mockup's
probe (https://polandy.github.io/glissando-assets/mockups/video-export/, tab "Gerät prüfen").

Playback: H.264 with AAC in MP4 is the one combination that iOS (Safari, Photos, Files) and TVs
(DLNA baseline: H.264 High 4.1 with AAC in MP4) all accept. Opus in MP4 plays in Chromium, Firefox,
VLC and Android but not on Apple devices. Safari plays WebM only from iOS 17.4 (Opus from 18.4), and
TVs rarely play it at all.

Muxers weighed (versions and sizes from npm on 2026-10-10, minified + gzipped for an MP4-only
write path):

| Candidate         | Licence | Size  | State                                            | Verdict                                                                               |
| ----------------- | ------- | ----- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| mediabunny 1.61.3 | MPL-2.0 | 33 KB | maintained (release 2026-10-05), no runtime deps | chosen                                                                                |
| mp4-muxer 5.2.2   | MIT     | 9 KB  | deprecated 2025-07 in favour of mediabunny       | same features, but frozen                                                             |
| webm-muxer 5.1.4  | MIT     | 8 KB  | deprecated                                       | WebM: no AAC, poor on iOS and TVs                                                     |
| mp4box.js 2.4.1   | BSD-3   | large | maintained                                       | a demux/segment toolkit, no WebCodecs writer                                          |
| own muxer         | —       | ~5 KB | ours                                             | 400–700 lines; files that play in Chrome but not on an iPhone or TV are the real risk |

## Decision

- **MP4, H.264 High, AAC-LC.** Opus replaces AAC only where the browser has no AAC encoder, and
  the export says beforehand that the file will not play on Apple devices. HEVC, VP9 and AV1 are not
  offered: a smaller file that does not play everywhere misses the point.
- **mediabunny**, pinned exactly with its integrity in the lockfile, loaded with a dynamic
  `import()` on the first export and precached for offline use. MPL-2.0 is file-level copyleft. We
  ship its files unmodified with their licence notice, which leaves the rest of the code unaffected.
- **Streamed to a file, `moov` up front.** The muxer writes in chunks to a `FileSystemWritableFileStream`:
  the file the user picks (`showSaveFilePicker`, Chromium), otherwise a file in the origin private
  file system, which is then shared or downloaded as a disk-backed `File`. The `moov` box is
  reserved at the start from upper bounds on the packet counts, which the frame count fixes before
  encoding. This yields a plain progressive MP4, not a fragmented one, without holding the video in
  memory.
- **Rendering on the main thread.** WebGL2 on an OffscreenCanvas in a worker is missing in two of
  three engines, and the encoders already run beside the main thread.

## Consequences

- The first export loads 33 KB more. Playing a slideshow never loads them.
- The export works without a server in every target browser. Where AAC is missing (Linux
  Chromium/Firefox), the file lacks sound on Apple devices, and the export says so up front.
- An upgrade of mediabunny is a reviewed bump of one exact pin. Should it ever stall, its API
  matches the frozen mp4-muxer, which makes it the fallback.
- A fragmented MP4 or a worker renderer stays possible later without a format change for users.
