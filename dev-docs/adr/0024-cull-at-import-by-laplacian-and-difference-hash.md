# ADR-0024: Bursts and blurry pictures are set aside at import, found by Laplacian variance and a difference hash

**Status:** accepted

## Context

Roadmap 7 (`dev-docs/SCOPE.md`; mockup: https://polandy.github.io/glissando-assets/mockups/culling/):
of a burst — several shots of one moment — only the best should play, and blurry shots should
not play at all. It has to work offline, in the browser, on a phone, on every picture of an
import, without a model download. Two questions: _where_ culling lives (at import, or as a mark
in the slideshow), and _how_ bursts and blur are found.

## Measurement

Generated scenes only (sky, hills, a sun, a standing figure, grass texture, drawn on a canvas
1200 px wide), stored as the import stores them — downscaled to the 480 px JPEG thumbnail at
quality 0.8 — and measured by the real worker in Chromium, Firefox and WebKit
(`src/culling/check-worker.browser.test.ts`). Out of focus is the scene drawn _n_ times smaller
and scaled up, which blurs alike in every engine (a canvas `filter: blur()` does nothing in
WebKit). Sharpness is the variance of the 4-neighbour Laplacian:

| Scene                 | Chromium  | Firefox   | WebKit    |
| --------------------- | --------- | --------- | --------- |
| sharp                 | 161 – 200 | 275 – 342 | 326 – 421 |
| soft ×2               | 103 – 124 | 124 – 152 | 196 – 250 |
| soft ×4               | 37 – 44   | 44 – 53   | 74 – 88   |
| out of focus, soft ×6 | 15 – 19   | 17 – 22   | 24 – 31   |

Difference-hash distance to the first frame of the same scene: drift of 0.5 % of the width 5 – 6
bits, 1 % 6 bits, 2 % 12 – 13 bits, soft ×2 0 – 7 bits; different scenes 18 – 39 bits.

## Decision

**At import.** Each picture the import stores is measured right after its downscale, in a worker,
on its 480 px thumbnail; "Next" (or "Add n") waits for the check as it waits for the downscale.
Once all are checked, all but the sharpest of each burst and the blurry ones leave the strip
for a "Set aside" section below it, where + takes one in and "Take all in" undoes the cull. A
set-aside picture is never part of the slideshow: its media is deleted with the import's
leftovers, and neither the slideshow model nor the `.glissando` format changes.

**Detection.**

- _Sharpness_: the variance of the 4-neighbour Laplacian on the grey thumbnail.
- _Same scene_: a 64-bit difference hash (9 × 8 cell means, one bit per horizontal pair); at
  most 10 bits apart is the same scene. This keeps frames up to about 1 % of camera drift and a
  slightly soft frame together, and different scenes well apart.
- _Burst_: a run of pictures, each at most 2 s after the one before and of the same scene; the
  sharpest is kept, ties to the earliest.
- _Blurry_: sharpness below 50 **and** below a third of the import's median. 50 sits between the
  out-of-focus scenes (≤ 31) and the sharp ones (≥ 161) in every engine; the median rule keeps a
  set shot all soft, in dim light say, from being emptied. A burst's kept picture is never
  blurry, and the median picture is never below a third of itself, so some picture always stays.

## Options weighed

- **Mark culled pictures as skipped in the slideshow** — everything stored, a flag per picture,
  changeable any time later. Costs the storage of every culled picture and a model and format
  change (the flag in the record and the `.glissando` file, and the player, export and editor
  honouring it), for a decision people make once, right at import. Rejected; "Take all in" is the
  way out, per import, and there is no settings switch.
- **Culling slideshows made before** — a "Find bursts and blurry shots" action: not now.
- **A learned quality model** (aesthetic or blur score): a model download of megabytes, slower
  on a phone, and no better at the two narrow questions asked here.
- **Perceptual hash by DCT (pHash)**: more robust to edits, but a burst is not edited; the
  difference hash is a few lines and needs no transform.
- **Capture time alone for bursts**: two different shots a second apart (turning from the view
  to the people) would be culled; the hash keeps them.
- **Blur by a fixed floor alone**: an import shot all in dim light would lose most of its
  pictures; the median share prevents it.

## Consequences

- The check costs one worker pass per picture on its thumbnail, beside the downscale of the
  next; the import's progress shows it as its own line.
- A flat picture — a plain-coloured graphic, a picture of fog — has almost no Laplacian and is
  set aside as blurry next to sharp photos; + takes it in.
- Linked photos of a server slideshow are not downloaded, so they are not checked.
- The constants live in `src/culling/cull.ts`; the browser test fails when a change to the
  measurement moves the generated scenes across them.
