# ADR-0032: Title cards are drawn by the player, over a picture or a ground

**Status:** accepted

## Context

A slideshow can open with a title slide and end with a closing slide (roadmap 11,
`dev-docs/SCOPE.md`; mockup https://polandy.github.io/glissando-assets/mockups/title-slides/).
Each carries a title and a subtitle in one of four styles. Behind the text is either a solid
colour or one of the slideshow's pictures, veiled so it does not dominate. On the title slide
the text can dissolve while the veil lifts ("reveal"), so the picture takes over. On the closing
slide the veil and the text settle in over the last picture, and the show then fades to black.
The text and the veil move over a running Ken Burns picture, so the card is animated, not a
still. It must reach every target the player reaches: the app, the video export, the HTML
export, the share page and the TV. Until now every slide had a picture (`Slide.image` is
required).

Options weighed:

1. **An overlay per target** (DOM text above the player, as the frame's album name is drawn).
   This is cheap in the app, but the video export records only the canvas, and each target
   would need its own copy of the motion.
2. **Rasterise the card into a picture at compose time** and play it as an ordinary picture
   slide. This reuses the whole picture pipeline. But it cannot animate the text over a moving
   picture (no reveal), and every export would have to carry generated image bytes.
3. **The player draws the card**, as it draws captions (ADR-0007). This means a new
   picture-less slide for the colour background, a veil in both renderers, and the card text
   rasterised to a texture.

## Decision

Option 3. A slide may carry a `card` (title, subtitle, style, position, ink, veil and timing).
The renderers draw it in screen space over the slide's picture, like a caption. Because a card
is part of its slide, the transitions carry it without a special case. A **ground slide**
(`ground` instead of `image` and `kenBurns`) is a solid colour and must carry a card. The
picture pipeline skips ground slides, and the shaders read a constant colour for such a layer.
The veil (lower saturation and contrast, a tint, the blurred backdrop of ADR-0028 mixed in) is
one per-layer amount that the card's timing animates. The composer turns the stored title and
closing slides into these slides. It merges a card into the first or last picture slide when
the card's picture is that very picture, so the show runs on from the reveal without repeating
the picture.

The card fonts are Bricolage Grotesque 700, Instrument Sans, Geist Mono and a new Instrument
Serif (the "Classic" style; same OFL family and source as the others). An export embeds only
the fonts that its cards use.

## Consequences

- The slideshow JSON goes to version 5, and the `.glissando` file to version 12. Older
  versions are refused (no instance predates this).
- The picture loading, the caption textures and the DOM renderer must accept a slide without a
  picture. Every place that reads `slide.image` changes.
- An HTML export with a card grows by the fonts its cards use (Instrument Serif about 30–40
  KB). One without a card stays as it is.
- The picture frame (ADR-0030) has no cards: its rounds are not composed from a stored
  slideshow.
- The text's motion is opacity, a short drift and a slight scale, per item of the text. A blur
  on the text would need another pass per frame and is left out. The "focus" entrance
  cross-fades to a copy blurred once when it is rasterised.
