# ADR-0028: Portrait pairs are composed, the blurred fill is the player's

**Status:** accepted

## Context

Every picture is cropped to cover the screen. A 3:4 portrait picture on a 16:9 screen — a TV, a
laptop, the 16:9 video export — keeps 42% of its height, so heads and feet go missing; a
landscape picture on a phone held upright loses as much of its width. Mockup:
https://polandy.github.io/glissando-assets/mockups/portrait-layouts/. Three questions need an
answer: who decides which pictures share a slide, who decides whether a picture is cropped or
shown whole, and how the renderer draws two pictures and a blurred backdrop in one slide.

## Decision

- **Pairs are composed.** `composeSlideshow` puts two portrait pictures that follow each other in
  play order on one slide (`Slide.partner`), greedily from the start, never reordering. A
  picture with any own setting (motion, caption, duration, transition) or marked
  `StoredPicture.alone` stays single. A pair lasts 1.5 × a single slide: the fixed seconds are
  multiplied, a shared music length is split by weight (single 1, pair 1.5), and the beats snap
  the boundaries as before. Both halves change together, with the slide's one transition.
- **The player lays a slide out per screen.** A pair sits side by side on a landscape screen and
  one over the other on a portrait screen, each half cropped to cover it. A single picture is
  cropped as before unless covering would hide more than a third of it; then it is drawn whole
  over a blurred, darkened copy of itself that covers the screen (the blurred fill). The Ken
  Burns motion of a whole picture crops within the picture's own shape. `Slide.fit` `"cover"`
  turns the blurred fill off for the slide.
- **The setting is the slideshow's**: `StoredSlideshow.portraitPictures` absent is automatic
  (pairs and blurred fill), `"one-at-a-time"` composes no pairs, `"fill-screen"` composes no
  pairs and gives every slide `fit: "cover"`, today's crop.
- **The WebGL renderer stays one pass**: each layer of the transition shader gets a layout
  (cover, whole over blur, pair across, pair stacked), a second picture sampler and crop, and
  the rect the whole picture is drawn in. The blur averages 32 taps spread over a disc of 8% of
  the screen height, Gaussian-weighted, each read from the mip level whose texels are about as
  wide as the taps lie apart, which the textures already have. The DOM fallback draws the
  backdrop as a second, CSS-filtered element and a pair as two clipped ones.
- Player JSON goes to version 4, `.glissando` and the server document to version 11. Older
  versions are refused, not read: no instance holds slideshows yet.

## Options weighed

- _The player pairs pictures at play time, per screen_ — rejected: the number of slides and their
  timing would differ between the phone, the TV and the video export, and the beats, the music
  and an own duration would no longer line up with one composed timeline.
- _Pairs as one collage image made at import_ — rejected: it is bound to one screen orientation,
  stores every portrait picture twice and breaks a picture's identity in the editor.
- _A separable Gaussian blur in a framebuffer pass_ — rejected: two extra passes and render
  targets per layer, where the tap disc over matching mip levels is as soft for a darkened
  backdrop at 32 lookups per backdrop pixel.
- _One lookup at a coarse mip level_ — rejected: on the screen its texels show as blocky steps.
- _Reorder pictures to form more pairs_ — rejected: the order is the user's (or capture order).

## Consequences

- Composition works in slides, not pictures: callers that showed one duration per picture map a
  picture to its slide (`slideOfPicture`).
- A slide holds one or two pictures; the player's picture buffer loads both.
- Caption, own motion and own duration keep their meaning, because such a picture is never
  paired.
