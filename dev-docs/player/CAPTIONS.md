# Captions

A caption belongs to its slide (ADR-0007): it fades, pushes and wipes with the slide's
transition, but stands still in screen space, unmoved by the Ken Burns motion. Its look
(`caption-layout.ts`, the same numbers for both renderers and the picture editor's preview):

- bottom left over a radial gradient from the bottom-left corner (120 % of the width by 100 % of
  the band, black at 50 % → 18 % at 55 % → clear at 80 %) covering the bottom 42 % of the screen;
- white Instrument Sans 600 at `max(15 CSS px, min(0.042 × height, 0.055 × width))`, line height
  1.22, 1.2 em from the left and 1.1 em from the bottom, a soft shadow;
- lines at most `min(72 % of the width, 34 em)` wide, broken between words (a word too long
  between characters) into at most two lines, the second ending in "…" when the rest does not
  fit (`breakCaption`, pure and measured through an injected `measure`).
