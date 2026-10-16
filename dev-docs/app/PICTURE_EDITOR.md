# Picture editor

- **Picture editor** (`picture-editor/`, route `routes/PictureEditorRoute.svelte`): a picture's
  own Ken Burns motion (mockup: https://polandy.github.io/glissando-assets/mockups/editor/) and
  its caption (mockup: https://polandy.github.io/glissando-assets/mockups/captions/), its own
  duration and transition into the next picture (mockup:
  https://polandy.github.io/glissando-assets/mockups/slide-timing/, ADR-0008). Its times are the
  player's: the automatic changes land on the beats of whichever song plays
  (`beats/playlist-beats.ts`, ADR-0023). Breadcrumb "Library / title / Picture 3"; header right ‹ previous picture, "3 / 8" (mono, hidden
  up to 720 px), › next picture (looking disabled at the ends). Back (arrow or browser) returns to
  the slideshow screen with that picture selected. Desktop: a dark well with the whole picture
  left, a 340 px panel right; up to 720 px the well spans the width on top (as high as the
  picture, at most 440 px, always the full width), the panel below.

A **video slide** opens the clip editor instead (ADR-0034, `dev-docs/player/VIDEO_SLIDES.md`):
a preview that plays the excerpt in a loop, with a slider under it to move within the excerpt by
finger or mouse (a paused clip stays where it was put; a handle drag shows the frame at the
handle, only the latest place being sought); the slider carries an ink mark at the player's
place. A strip below shows the whole clip with a start and an end handle (arrow keys move by
0.1 s, Shift by 1 s, Home/End to the limits) and, always once a position is known, an ink line at
the player's place at the whole clip's scale with a time chip below it. "In the film" length
(0.5 s to 5 min), Sound On/Off with a volume slider (0–100, step 5), "Music quieter meanwhile", a
note that the transition runs inside the excerpt's end, Reset and Done. There is no Ken Burns or
duration section: the excerpt is the slide's length. Slideshow tiles show the length badge.

| Section                                                        | What it covers                                   |
| -------------------------------------------------------------- | ------------------------------------------------ |
| [Frames, focus and changing a frame](picture-editor/FRAMES.md) | The Start and End frames, the focus, dragging    |
| [Preview](picture-editor/PREVIEW.md)                           | Playing the motion in the well                   |
| [Panel, automatic and own](picture-editor/PANEL.md)            | The panel's Ken Burns section, automatic vs. own |
| [Caption](picture-editor/CAPTION.md)                           | The caption field                                |
| [Duration](picture-editor/DURATION.md)                         | A picture's own duration                         |
| [Transition](picture-editor/TRANSITION.md)                     | The transition into the next picture             |
| [Layout](picture-editor/LAYOUT.md)                             | The "Always alone" switch (ADR-0028)             |
