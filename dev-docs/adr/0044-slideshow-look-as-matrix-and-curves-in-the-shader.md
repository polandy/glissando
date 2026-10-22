# ADR-0044: A slideshow's look is a colour matrix and tone curves in the slide shader

**Status:** accepted

## Context

A slideshow gets one look — None, Warm, Cool, Vivid, Film, Black & white or Faded — chosen in a
"Look" sheet on the slideshow screen. It has to look identical in playback, the video export,
the web page export, the TV and picture-frame player and a `.glissando` file, and it must not
cost an extra render pass. Four questions need an answer: how the grade is computed, what the
player is told, where the choice is stored, and what it applies to.

## Decision

- **A look is a 3×3 colour matrix plus an offset, then a tone curve per channel** of five evenly
  spaced knots, interpolated linearly, all on the sRGB-encoded values the textures hold
  (`LOOK_GRADES` in `src/player/looks/`, values in `dev-docs/player/LOOKS.md`). The slide
  fragment shader applies it in the same pass, right after a layer's picture colour and before
  the card veil, captions and card text. "None" is the identity and is skipped by a uniform flag.
  The DOM fallback applies the same numbers as an SVG `feColorMatrix` + `feComponentTransfer`
  (`table`) filter, which computes exactly this: a clamped matrix, then piecewise-linear tables.
- **The player JSON carries the look's id**, a top-level `look` (format version 9), absent for
  None; the player owns the grade table. Every consumer — in-app player, video export, web page,
  TV, file page — gets it through `composeSlideshow`, so none can differ.
- **`StoredSlideshow` gains an optional `look`**, absent for None, like the default transition
  (ADR-0010): choosing None deletes the field. Validated where it enters (the edit, the
  `.glissando` reader, the server document reader). The `.glissando` format goes to version 17
  and the server document to version 4, both with an optional `look`; no migration and no
  mapping of older shapes — a slideshow without the field simply has no look.
- **What is graded**: every picture and video layer, including the blurred fill behind a whole
  picture and the picture behind a title card. **Not graded**: a ground slide's flat colour, the
  card veil, card text and captions — they are the app's own design colours, not photographs, and
  a caption must stay legible whatever the look.

## Options weighed

- _A 3D LUT texture_ (e.g. 17³ or 33³ RGB) — rejected for now: more expressive and the industry's
  exchange format (`.cube`), but it needs a 3D texture per look, its upload and a texture unit in
  every program, trilinear precision differs between mobile GPUs, the DOM fallback cannot apply
  it, and its colour maths cannot be unit-tested as plain numbers. Seven built-in looks are all
  matrix-plus-curve shapes; a LUT path can be added beside it if user-loaded LUTs ever come.
- _A separate post-processing pass over the composed frame_ — rejected: an extra framebuffer and
  pass on phones and TVs, and it would grade captions and cards too.
- _Resolve the look into raw matrix and curve numbers in the player JSON_ — rejected: a longer,
  unreadable contract with every value to validate, for no gain; the export page and the TV run
  the same player build that composed it.
- _Grade the picture behind a title card only partly, or not_ — rejected: the picture is one of
  the slideshow's photographs and changing its colour between the card and the next slide would
  show as a jump.
- _Even out colours from different cameras_ (automatic white balance per picture) — split off to
  `TODO.md`: a fixed grade cannot neutralise one camera's cast against another's.

## Consequences

- Adding a look is one table entry, its message-catalogue names and a pixel-test row; the shader
  stays unchanged.
- The colour maths is a pure function (`gradeColour`) tested on numbers; one browser pixel test
  per renderer proves the shader and the SVG filter match it.
- Choosing a look stores at once; "Back to None" offers an undo, as the transition sheet does.
