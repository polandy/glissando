# Preview

- **Preview** (`MotionPreviewScreen.svelte`, timing in `timing/preview-timeline.ts`): at the
  top of the panel, staying in view (sticky) while the panel, or up to 720 px the page,
  scrolls. A 16:9 screen plays the picture over its real duration with its motion, rendered
  with the player's own crop and transform; its transition into the next picture in the
  picture's last part, the next picture's motion starting with it as in the player
  (ADR-0002); then 0.9 s of the next picture, or at the last picture a black "End of
  slideshow" card; then it loops. Play/pause, a progress track whose end is hatched in the
  accent where the transition runs, "0:02.4 / 0:05.0" (the picture's time), and the line
  "Picture 5 · 5.0 s, with Circle 1.0 s into picture 6" ("…, then a cut to picture 6",
  "…, then the slideshow ends"). The effects are the player's shaders redone in CSS on two
  layers (`timing/transition-styles.ts`), eased as the player eases them: crossfade, push,
  wipe, circle and zoom follow the shaders' geometry and soft edge; dissolve is approximated,
  revealing a 16 × 9 grid of cells in the shader's noise order where the player reveals
  4-pixel cells. Changing a frame pauses it on that frame of this picture alone (start or
  end); play then starts over. "Swap start and end" and "Back to automatic" replay the new
  motion from the start, and so does a new duration. Picking a transition (or its "Back to
  automatic") plays from 1.2 s before the transition. With reduced motion it starts paused; a
  swap, reset or new duration holds it at the start, a picked transition half-way through it.
- A picture composed into a portrait pair (ADR-0028) previews as its half of the pair's slide:
  the pair's duration and its half's motion (no sideways pan), and on either half the slide's
  one transition into the slide after the pair — "…into picture 6" for pictures 4 and 5. The
  automatic transition and motion follow the slide's position, not the picture's.
