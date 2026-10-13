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

| Section                                                        | What it covers                                   |
| -------------------------------------------------------------- | ------------------------------------------------ |
| [Frames, focus and changing a frame](picture-editor/FRAMES.md) | The Start and End frames, the focus, dragging    |
| [Preview](picture-editor/PREVIEW.md)                           | Playing the motion in the well                   |
| [Panel, automatic and own](picture-editor/PANEL.md)            | The panel's Ken Burns section, automatic vs. own |
| [Caption](picture-editor/CAPTION.md)                           | The caption field                                |
| [Duration](picture-editor/DURATION.md)                         | A picture's own duration                         |
| [Transition](picture-editor/TRANSITION.md)                     | The transition into the next picture             |
| [Layout](picture-editor/LAYOUT.md)                             | The "Always alone" switch (ADR-0028)             |
