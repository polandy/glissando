# ADR-0020: Music a target browser cannot decode becomes a FLAC copy, made by an own libav.js build

**Status:** accepted

## Context

Roadmap 5 (`dev-docs/SCOPE.md`): music files the browser cannot decode are converted on the
device. Before this change, the Music step read a file's length with an `<audio>` element. A file
it could not read gave the toast "The music could not be read". A file `<audio>` could read but
`decodeAudioData` could not got through, then failed in the waveform (ADR-0009) and in the video
export (ADR-0015).

Measured in the pinned Playwright image (v1.63.0, Linux) on 2026-10-10, with `decodeAudioData`
on generated 440 Hz sine tones (`scripts/audio-decode-probe.sh`):

| Format                                       | Chromium 153 | Firefox 155 | WebKit 26.6 (GStreamer) |
| -------------------------------------------- | ------------ | ----------- | ----------------------- |
| MP3, AAC-LC (M4A, ADTS), FLAC, Opus, PCM WAV | yes          | yes         | yes                     |
| Vorbis (Ogg, WebM)                           | yes          | yes         | yes                     |
| ALAC, AIFF, AC-3, E-AC-3, AMR                | no           | no          | yes                     |
| WMA, CAF                                     | no           | no          | no                      |
| a truncated MP3, a text file named `.mp3`    | no           | no          | no                      |

Linux WebKit decodes through GStreamer, so its column does not stand for Safari, which decodes
through Core Audio. Safari is documented (MDN, caniuse) to decode ALAC and AIFF but not Vorbis,
WMA or AC-3. The mockup's "Check device" tab
(https://polandy.github.io/glissando-assets/mockups/audio-formats/) checks the same sample files
on a real device. WebCodecs is no way round this: `AudioDecoder` supports neither ALAC nor AC-3
in any of the three engines.

Decoders weighed (npm, 2026-10-10):

| Candidate                                                 | Licence  | Formats beyond the browser's                     | Offline cost      | Verdict                                 |
| --------------------------------------------------------- | -------- | ------------------------------------------------ | ----------------- | --------------------------------------- |
| mediabunny 1.61.3 (already used) + `@mediabunny/ac3`      | MPL-2.0  | AC-3/E-AC-3 only; no ALAC, AIFF, CAF, WMA or AMR | ~0.6 MB           | misses the commonest case, ALAC         |
| `@wasm-audio-decoders/*` (mpg123, flac, ogg-vorbis, opus) | MIT      | Vorbis only                                      | ~0.2 MB per codec | covers codecs browsers already decode   |
| `@libav.js/variant-*` 6.10.9 (prebuilt)                   | LGPL-2.1 | none of ALAC, WMA, AC-3, AMR                     | 12–16 MB          | no prebuilt variant has the codecs      |
| `@ffmpeg/core` 0.12.10 (ffmpeg.wasm)                      | GPL-2.0+ | all                                              | ~31 MB            | GPL, and 31 MB in every install's cache |
| **own libav.js 6.10.9 build** with only the codecs below  | LGPL-2.1 | all                                              | see Consequences  | chosen                                  |

## Decision

- **Recognise, then convert what is not portable.** At import, the format is recognised from the
  file's first bytes, never from its name or MIME type (`src/import/music-format.ts`; MP4 by
  walking to the first sample entry, since `moov` often sits at the end). MP3, AAC, FLAC, Opus and
  PCM WAV are stored as they are. ALAC, AIFF, CAF, AC-3, E-AC-3, WMA, AMR and Vorbis are
  converted, also where this browser plays them: a slideshow made on an iPad must play on
  Windows, also as a `.glissando` file (ADR-0004) or an HTML page (ADR-0017). An iTunes track
  with DRM (`drms`) is refused at once. A format not recognised is left to the browser, as before.
- **Into FLAC**, lossless, which all three engines decode (also Safari 11+) and mediabunny,
  `decodeAudioData` and `<audio>` all read. Only the copy is stored, named after the original with
  `.flac`. An Opus copy would be about a fifth of the size, but Safari plays Opus in Ogg only from
  18.4, so it was not chosen. An Opus original is still kept as it is: converting it would
  multiply its size for the few Safari versions before 18.4.
- **The decoder is an own libav.js build** (Yahweasel/libav.js, LGPL-2.1, tag `v6.10.9.0`),
  configured from its fragments with only `avformat`, `avcodec`, `decoder-alac`, `demuxer-aiff`
  (with the big-endian PCM decoders), `demuxer-mp4`, `demuxer-caf`, `decoder-ac3`, `demuxer-ac3`,
  `decoder-eac3`, `demuxer-eac3`, `parser-ac3`, `decoder-wmav1`, `decoder-wmav2`, `demuxer-asf`,
  `decoder-amrnb`, `demuxer-amr`, `decoder-vorbis`, `demuxer-ogg`, `demuxer-webm`,
  `encoder-flac` and `muxer-flac`. All of them are FFmpeg's own C code, so no further library is
  linked and no part is GPL. libavfilter is left out: the decoded samples are interleaved and,
  from a lossy codec's floats, rounded to 16 bits in TypeScript (`src/import/flac-samples.ts`).
  Up to 24 bits are kept, so a converted ALAC track decodes to the original's exact samples. `scripts/build-audio-decoder.sh` builds it in the
  `emscripten/emsdk` image pinned by digest, with the libav.js commit and the sha256 of every
  source tarball checked, because libav.js's own Makefile fetches sources unverified. Only the
  single-threaded build is kept: the loader, the module factory and the `.wasm` file. They are
  committed under `src/import/libav/`, pinned by sha256 in a unit test like the pico cascade
  (ADR-0012), and listed with their licence in `third-party-licenses.md`.
- **It runs in a worker** (libav.js's own), loaded with a dynamic `import()` on the first
  conversion. The service worker precaches it with every other asset (ADR-0005), so conversion
  works offline and never downloads anything at that moment.
- **The Music step shows the conversion** (mockup above): the picked file's card with
  "converting on this device", a progress bar and why, a ✕ that cancels it, and the primary button
  disabled until it is done. A file that cannot be read, converted or played is a coral notice in
  the drop zone's place, instead of a toast.

## Consequences

- Every install caches the decoder: 1.7 MB, 0.66 MB gzipped (1.4 MB of it WebAssembly). The
  first conversion loads it; importing portable music never does. A generated 4-minute ALAC or
  WMA track converts in about 0.9 s on a desktop (Node, the same WebAssembly, one thread); a
  phone takes several times that, hence the progress bar.
- A converted track is several times larger than a lossy original: FLAC keeps CD-quality music at
  roughly 60 % of its 10 MB a minute, so a 4-minute WMA of about 4 MB becomes about 25 MB. That is the price of playing everywhere without a second lossy generation.
- Music stored before this change is left as it is.
- Upgrading the decoder is a reviewed run of the build script with a new tag and new hashes; CI
  never rebuilds it.
- More formats are a fragment each in the build script, then a mapping in `music-format.ts`.
