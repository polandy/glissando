# ADR-0061: The automatic Ken Burns zoom is capped by the picture's sharpness on screen

**Status:** accepted

## Context

The automatic Ken Burns motion (`autoKenBurns`, [KEN_BURNS](../composition/KEN_BURNS.md)) zooms
every picture alike. A soft subject, or a picture smaller than the screen, zoomed in shows its
softness more and more. The cull already scores sharpness (the variance of the 4-neighbour
Laplacian, `src/culling/sharpness.ts`), but on the 480 px thumbnail, where a picture soft at
screen size still looks sharp.

## Options weighed

- **Score the thumbnail with the cull's floor.** Free, but the thumbnail hides exactly the
  softness a zoom on screen reveals.
- **Score the original at full size.** Truest to the pixels, but the screen never shows them:
  a 24 MP picture is downscaled about fourfold, and decoding it costs far more.
- **Score the display rendition drawn at screen size (chosen).** The import already keeps it
  (at most 3840 × 2160); drawn so it covers a Full HD reference screen in its own orientation,
  scaled up where it is smaller, it is what a viewer sees at zoom 1.

## Decision

- **Measured in the focus worker, stored in the focus.** The device focus pass hands the
  detector the picture's display rendition beside its thumbnail, the server pass Immich's
  preview (what the player shows of a server picture) beside its downscaled copy; a focus
  Immich's faces already give is measured on the preview alone (`FocusDetector.measure`); the worker draws it at
  `screenSize` and stores `sharpness` in the `PictureFocus`: inside the subject's box, or,
  without a subject, the sharpest tile of a 3 × 3 grid, so a plain sky does not count as soft.
  `FOCUS_DETECTOR_VERSION` 4 makes every stored focus outdated once, so every picture is
  measured.
- **The cap.** Zooming by z divides the score by about z² (`SHARPNESS_FALL_EXPONENT`), so a
  picture of score s may zoom to `(s / SOFT_ON_SCREEN_SHARPNESS)^(1/2)`, never below
  `SMALLEST_ZOOM_TRAVEL`. `autoKenBurns` lowers a subject's zoom, and both ends of a scenery
  sweep, to it; a focus without a sharpness is not capped. A chosen motion is never capped.
- **Calibrated on generated scenes** (no photo involved, `screen-sharpness.browser.test.ts`,
  all three engines): a scene drawn at screen resolution and the same scene twice as soft
  differ by 2^1.8–2^2.0 (the theory for white-noise texture, z⁴, overstates the fall); the
  floor 20 sits at about the sharp scenes' score zoomed twofold, so each sharp scene still
  zooms past 1.2 and each scene twice as soft stays under a scenery sweep's 1.15.
- **Carried by `.glissando` files from format version 23** (`SHARPNESS_FROM_VERSION`); an
  older file's focus has none, and a version 22 file carrying one is damaged.

## Consequences

- A soft picture moves less, never not at all.
- The score is absolute: a very low-contrast sharp picture scores low and is zoomed less than
  it could be.
- The first pass after the update looks at every picture again, on the device and on the server.
- A server picture costs one more preview download where Immich's faces gave its focus.
- A device picture imported from Immich with faces (or kept from a server slideshow) stores
  that focus unmeasured; the device pass measures it on the picture as shown, keeping the focus,
  and does not detect anew. A look-again detects anew.
