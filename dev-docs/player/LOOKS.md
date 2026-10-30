# Looks

A slideshow's look grades every picture and video layer the same way in every renderer
(ADR-0044). The table and the maths live in `src/player/looks/`; `gradeColour(look, rgb)` is the
reference the shader and the DOM fallback are tested against.

## The grade

On sRGB-encoded values in 0–1, alpha untouched:

1. **Matrix**: `out = clamp(M · rgb + offset, 0, 1)`, `M` 3×3 by rows.
2. **Tone curve** per channel: five knots `v0…v4` at 0, ¼, ½, ¾, 1; between two knots the value
   is interpolated linearly — `k = min(floor(c · 4), 3)`, `out = v[k] + (c · 4 − k) · (v[k+1] − v[k])`.

This is exactly SVG's `feColorMatrix` (`type="matrix"`, offsets in the fifth column) followed by
`feComponentTransfer` with `type="table"`, with `color-interpolation-filters="sRGB"`.

`S(s)` is the saturation matrix with Rec. 709 luma `L = (0.2126, 0.7152, 0.0722)`: row _i_ is
`(1 − s) · L + s · eᵢ`.

| Id                | Name          | Matrix rows (r g b · offset)                                   | Curve R             | Curve G             | Curve B             |
| ----------------- | ------------- | -------------------------------------------------------------- | ------------------- | ------------------- | ------------------- |
| `none`            | None          | identity — skipped                                             | —                   | —                   | —                   |
| `warm`            | Warm          | `1.08 0.02 0 · 0.015` / `0.01 1.01 0 · 0.008` / `0 0 0.86 · 0` | 0 .27 .53 .78 1     | 0 .25 .51 .76 .98   | 0 .23 .47 .72 .94   |
| `cool`            | Cool          | `0.9 0 0 · 0` / `0 1 0.02 · 0.01` / `0 0.03 1.1 · 0.03`        | 0 .24 .49 .74 .95   | 0 .25 .51 .76 .98   | .02 .28 .53 .78 1   |
| `vivid`           | Vivid         | `S(1.35)`, offset 0                                            | 0 .2 .5 .82 1       | same                | same                |
| `film`            | Film          | `S(0.82)`, offset 0                                            | .05 .2 .5 .82 .97   | .05 .21 .49 .79 .94 | .1 .25 .48 .73 .88  |
| `black-and-white` | Black & white | every row `L`, offset 0                                        | .02 .18 .5 .84 1    | same                | same                |
| `faded`           | Faded         | `S(0.7)`, offset 0                                             | .14 .36 .58 .79 .94 | .13 .35 .57 .78 .93 | .15 .36 .57 .77 .91 |

Order in the sheet is the table's order. The mockup that fixed these values:
`https://polandy.github.io/glissando-assets/mockups/slideshow-looks/`.

## What is graded

- Graded: a picture slide's picture and its partner, the blurred fill, a video's frames, the
  picture behind a title or closing card — in both layers of a transition.
- Not graded: a ground slide's colour, the card veil, card text, captions, the end fade.

## Renderers

- **WebGL2**: uniforms `lookOn` (bool), `lookMatrix` (mat3), `lookOffset` (vec3) and
  `lookCurve` (vec3[5], one knot per channel each) are set once per frame; the prelude grades a
  layer's colour right after `layerColor`, never for `isGround`. No extra pass, no texture.
- **DOM fallback**: one inline SVG `<filter>` per frame's look, built from the same table, on
  every picture and video element (and the blurred copy); none on cards and captions.

## Tests

- Unit: `gradeColour` against hand-computed values per look, identity for None, clamping, knot
  and between-knot values; the SVG filter attribute strings built from the table.
- Browser, WebGL (`webgl-looks.browser.test.ts`): a solid colour drawn with each look reads back
  as `gradeColour` of it within `COLOUR_TOLERANCE`; a caption and a ground card read back
  unchanged under a look.
- Browser, DOM (`dom-looks.browser.test.ts`): a graded look's `<filter>` matches `lookFilterValues`
  exactly; a picture, a pair's two and a blurred fill's front and backdrop each carry it (the
  backdrop after its own blur and darken); a cover layout's veil combines with it, look first, on
  their one shared node; a ground card and a caption carry no filter at all. WebKit's Canvas 2D
  does not apply a `url(...)` SVG filter reference, so this cannot read back actual pixels as the
  WebGL test does.
