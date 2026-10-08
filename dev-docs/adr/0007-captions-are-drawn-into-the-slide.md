# ADR-0007: Captions are drawn into the slide

**Status:** accepted

## Context

A picture's caption (roadmap 1, `dev-docs/SCOPE.md`) is one line of text shown bottom left in
the player. It belongs to its slide: it should fade, push and wipe with the slide's transition,
but stand still while the Ken Burns motion moves the picture. The player has two renderers,
WebGL2 with one shader per transition and the DOM fallback, and a later video export will render
the same frames at its own resolution. The caption is stored like a picture's own motion
(ADR-0006): an optional field on the stored picture, in the `.glissando` file (version 3) and in
the slideshow JSON; that needs no decision of its own.

## Decision

The caption is part of the slide's picture as the renderers draw it. In WebGL, each loaded slide
with a caption gets a texture holding its band, gradient and text, drawn once with Canvas 2D at
drawing-buffer resolution (premultiplied), released with the slide's picture and drawn anew on a
resize. The transition shaders composite it over the picture in screen space inside
`fromColor`/`toColor`, so every effect carries it without a special case. The player's
`captionInset` (lifting captions above overlaid controls) is a uniform that only shifts where
the band is sampled. Text is laid out by a pure function (`breakCaption`, at most two lines with
an ellipsis) measured through an injected `measure`; drawing waits for the caption font through
an injected font port. The DOM fallback places a caption element after the slide's `<img>`,
outside its Ken Burns transform, styled from the same numbers (`captionStyles`). The caption's
look lives with the player (`caption-layout.ts`), not in the app's design tokens, because a
canvas draws it. Screen readers hear the caption from a visually hidden live region in the
player overlay.

## Options weighed

- _One DOM overlay above both renderers, faded in step with the timeline_ — the browser sets the
  text sharply, plain CSS, the least code today; rejected because on a push or a wipe the
  caption would stay put while its picture moves away, and the video export would still need a
  canvas path that must look the same: two ways of drawing one caption.
- _Text in WebGL from a signed-distance-field glyph atlas_ — scales freely, one texture for all
  captions; rejected as far too much code for one line of text: umlauts, kerning and line
  breaking would all be ours.

## Consequences

- Every transition, present and future, carries the caption with its slide; the video export
  renders it at its own resolution through the same path, burnt in.
- Typesetting is ours: the font must be loaded before drawing (until then slides draw without
  captions, then redraw), a resize redraws each caption texture, and each loaded slide with a
  caption holds one more texture (as wide as the screen, 42 % of its height).
- Two lines are laid out by our greedy line breaker, not by the browser's balanced wrapping.
- The caption's text is not in the page as text: screen readers rely on the live region.
