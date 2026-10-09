# ADR-0012: Automatic focus comes from pico.js on the thumbnail, stored beside the media

**Status:** accepted

## Context

Roadmap 2 (`dev-docs/SCOPE.md`): the automatic Ken Burns motion aims at people or the subject
instead of the picture's middle. Immich photos will bring Immich's face data (roadmap 3); every
other picture needs a detection that runs in the browser, offline, with every asset shipped by
the app (ADR-0005) and nothing sent to a third party. It has to be cheap enough to run on a
phone for every picture, and it must never hold up playing.

The candidates were measured, not guessed: 59 of the owner's photos with 133 hand-tagged faces
(digiKam regions, 2006–2020, groups and small faces included) plus 20 drone shots without
people, in Chromium 153 at CPU throttle 1×, 4× and 6× (4× ≈ a mid-range phone). "Hits a face"
is the share of pictures whose chosen focus point lies inside a tagged face (box grown 1.5×).

| Candidate (on the 480 px thumbnail)  | Download, gzip  | ms per picture 1× / 4× / 6× | Hits a face | Finds nothing |
| ------------------------------------ | --------------- | --------------------------- | ----------- | ------------- |
| Shape Detection `FaceDetector`       | —               | not available               | —           | —             |
| MediaPipe face detector, full range  | 4.2 MB + 1 MB   | 8 / 34 / 52                 | 73%         | 10%           |
| MediaPipe face detector, short range | 4.2 MB + 0.2 MB | 3 / 12 / 18                 | 37%         | 49%           |
| pico.js + facefinder cascade         | 0.23 MB         | 53 / 213 / 324              | 68%         | 17%           |
| Saliency (spectral residual, + skin) | 1 KB            | 1 / 5 / 7                   | 15–36%      | never         |
| The picture's middle (no detection)  | 0               | 0                           | 39%         | —             |

## Decision

- **pico.js** (nenadmarkus/picojs, MIT) with the **facefinder cascade** (nenadmarkus/pico,
  MIT). Neither is published on npm, so there is no package to pin: pico.js is ported to
  TypeScript (`src/focus/pico.ts`, its upstream relies on implicit globals) with its licence,
  source commit and sha256 in the header; the cascade is the upstream file at a fixed commit
  (`facefinder.bin` — without an extension Vite's dev server serves it as a module), pinned by
  sha256 in a unit test. The face fixture in the tests is NASA's public-domain portrait from
  scikit-image's test data.
- It runs on the stored **480 px thumbnail**, in a **Web Worker**, so the ~0.2 s a phone needs
  per picture never blocks playback or the editor. The focus is the box of the strongest
  detection; no detection is stored as "none" and the motion keeps today's rule.
- **When:** a background pass, one picture at a time, over every picture without a result: when
  the library opens and whenever a slideshow is created. Playing never waits for it; a picture
  not looked at yet plays today's motion.
- **Where:** a `pictureFocus` IndexedDB store keyed by picture id, beside the media and deleted
  with it — not on `StoredPicture`, whose record the editor rewrites from its in-memory copy.
- **`.glissando` files do not carry it** (format unchanged): the focus is an automatic result, like
  the automatic motion; the receiving device detects it again in the background.
- **Override:** a picture's own motion (ADR-0006) still replaces the automatic one, focus or not.

## Options weighed

- _Shape Detection `FaceDetector`_ — zero bytes; rejected because it is unavailable: behind a
  flag in Chrome (also on Android) and Safari, and under the flag Chromium on Linux answers
  "Face Detection not implemented".
- _MediaPipe full range_ — 5 points more accurate; rejected because it adds ~5 MB to download and
  ~7.5 MB to the offline cache (two WASM builds, SIMD and not), and the library posts usage
  metrics to Google every 60 s with no opt-out, against "nothing is fetched from a third party".
- _MediaPipe short range_ — made for selfies; finds nothing in half the photos.
- _A saliency heuristic, no model_ — free, but no better than aiming at the middle.
- _At import_ — would lengthen every import; a background pass also covers existing slideshows
  and opened files.
- _Carry the focus in `.glissando` files_ — saves the receiver a few seconds per hundred pictures
  but needs a format version and freezes today's detector into every file.

## Consequences

- Small faces are the weak spot: 4 of 15 pictures with only small faces are hit. The automatic
  motion zooms gently (at most 1.2×), so a missed face is not cut off, only not aimed at.
- In a group the motion aims at the strongest face, not the group's middle; aiming at the union
  of all detections hit less often in the measurement.
- The picture editor marks the focus and the library shows the pass's progress (mockup:
  https://polandy.github.io/glissando-assets/mockups/automatic-focus/).
- A better detector later reaches every picture by clearing the `pictureFocus` store in a
  database upgrade; nothing else stores the result.
- Immich's face data (roadmap 3) can fill the same store for Immich photos.
