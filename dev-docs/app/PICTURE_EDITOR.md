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
  - **Frames**: two 16:9 frames on the picture, "Start" and "End" — exactly what the player
    crops for a 16:9 screen (`frame-geometry.ts` over the player's `cropRect`). The active one is
    solid white with four corner handles and veils the rest of the picture; its label chip sits
    top left (Start) or bottom right (End). The other one is dashed. A pointer that goes up
    before travelling 8 px is a tap, and a tap picks a frame only where that is unambiguous:
    inside the inactive frame alone, or within 24 px of exactly one frame's border (also where
    the frames overlap or nest; when both borders are that near, nothing). Otherwise a tap does
    nothing; the inactive frame's chip, or the panel's "Start | End" toggle, always picks it, the
    chip already on pointer down. A mouse shows a pointer where a click would pick the other
    frame, a move cursor elsewhere on the picture. The active frame's handles come first: a
    12 px square with a 36 px hit area, 18 px and 48 px on a touch screen, reaching past the
    picture's edges into the well's margin (20 px, 24 px on a touch screen, on a phone too, so
    the whole hit area stays on screen). A dashed line joins
    the two centres; while the preview plays, a peach outline runs over the picture with it.
  - **Focus** (`focus-indication.ts`, `FocusMarker.svelte`, `FocusLine.svelte`): with the
    automatic motion, accent corner brackets mark the subject box it aims at, with a small
    "Focus" chip above it (below a box at the picture's top, right-aligned at its right edge);
    over the frames, never in the way of a drag. Found while the editor is open, the marker
    settles in (fades in from slightly larger; at once with reduced motion); a focus already
    known, on opening or on ‹/›, shows at once. Under the picture
    one quiet line: "No subject found – the motion stays centred." or, while the search is still
    to come, a pill "Looking for the focus …" with a pulsing mint dot (still with reduced
    motion). A picture not looked at (its detection failed) shows nothing; nor does an own
    motion, whose frames say where it goes — back to automatic, the marker returns at once.
  - **Changing a frame**: a drag anywhere on the picture (one pointer, past 8 px, counted from
    where it went down) moves the active frame by the pointer's travel; a corner resizes it about
    the opposite corner (shape kept), the wheel and two fingers anywhere zoom (at once, without
    the 8 px); on the focused frame the arrow keys move it by
    1 % (Shift 5 %), + and − zoom by 0.05. Zoom runs from 1 (the whole picture as far as it fills
    a 16:9 screen) to 3, and the frame never leaves the picture. A drag is stored when it ends,
    every other change at once.
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
  - **Panel**: below the preview "Picture 3 of 8", file name · capture date; "Ken Burns" with the
    state "Automatic" or "Own motion" (accent-tinted); the toggle, each half with "Zoom 1.20×";
    up to 720 px the hint "Drag anywhere to move the frame; corners or two fingers zoom." (wider,
    under the well: "Drag to move the frame, drag a corner to zoom · mouse wheel zooms · arrow
    keys, + and −"); "Swap start and end" and "Back to automatic".
  - **Automatic and own**: until changed, the frames show the automatic motion. The first change
    makes it the picture's own (the automatic one, changed), stored at once like every edit.
    "Swap start and end" reverses the motion (an automatic one becomes own). "Back to automatic"
    (looking disabled, titled "The motion is already automatic", while it is) drops the own
    motion without asking; the toast "Motion back to automatic" with "Undo" brings it back. An own
    motion stays with its picture through reorder, removal and undo; the automatic one follows
    the position.
  - **Caption** (`CaptionField.svelte`): below the Ken Burns section, after a hairline, the
    eyebrow "Caption" with the counter "14 / 80" (mono, characters as typed, an emoji counting as one) right of it; a
    one-line field (typing and pasting stop at 80 characters as the counter counts them, the
    caret staying put; the counter and hint describe it to a screen reader; placeholder "e.g. Evening on the jetty", Enter key labelled
    "done") with a ✕ inside on the right while it holds text, which empties it and keeps the
    focus; the hint "Shown bottom left in the player, fading in and out with the picture. Empty:
    no caption." Every keystroke is stored at once, normalised (`normalizeCaption`: whitespace
    runs become one space, trimmed, at most 80 characters; nothing left removes the caption), and
    a keystroke that changes nothing stored stores nothing. Enter leaves the field; leaving it
    tidies the text to what is stored. Nothing is filled in automatically. The preview shows
    the caption in the player's place, size and type over a 16:9 screen (`captionStyles`, type
    at least 10 px so the small screen keeps the player's proportions); it wraps with CSS like
    the DOM fallback, so its line breaks can differ from the WebGL player's.
  - **Duration** (`DurationSection.svelte`): below the caption, the eyebrow "Duration" with the
    state "Automatic" or "Own duration" (accent-tinted); a stepper − "5.0 s" + (mono, announced
    politely) in half-second steps from 2 to 15 s, − and + looking disabled (`aria-disabled`) at
    the bounds. The first step from an automatic duration off the half-second grid (shared music
    can leave it off the grid) rounds to the next grid value in the step's direction — up for +,
    down for − — and makes it the picture's own; on the grid, + and − move by half a second as
    usual. The hint follows the case: without music "The slideshow's seconds per picture. − and +
    make it this picture's own." or, own, "Automatic would be 5.0 s, the slideshow's seconds per
    picture."; with music "The music is shared evenly across the 7 pictures without an own
    duration." or, own, "The other 7 pictures share the rest of the music: 4.6 s each." or, when
    the own durations use up the music, "The music is used up; the other 7 pictures get the
    minimum, 2.0 s each." or, when every picture has its own, "Every picture has its own
    duration; the slideshow no longer follows the music's length." — each followed by "2 to
    15 s." Then "Back to automatic"
    (disabled-looking and titled "The duration is already automatic" while it is); the toast
    "Duration back to automatic" with "Undo" follows. How durations share the music:
    `dev-docs/COMPOSITION.md`.
  - **Transition** (`TransitionSection.svelte`): the eyebrow "Transition to picture 6" with the
    state "Automatic" or "Own transition"; a radiogroup of seven tiles in four columns —
    Crossfade, Push, Wipe, Circle, Zoom, Dissolve, Cut — each looping its effect from this
    picture to the next in a small 16:9 frame (Cut: a hard switch, with a slash), still half-way
    with reduced motion. The applied choice has an accent outline, dashed while automatic, and
    the automatic effect carries an "Auto" tag. Tapping any tile, also the automatic one, makes
    it the picture's own; the arrow keys move the choice (selection follows focus, one tab
    stop). The hint: "Takes 1.0 s at the end of picture 5: 30 % of the picture's time, at most
    1 s." or, for a cut, "Picture 6 follows without a transition.", while automatic prefixed by
    "Automatically, the slideshow's transition applies: Crossfade." or, for an alternating
    default, "Automatically, the transitions alternate, as set for the slideshow." The automatic
    choice is the slideshow's default (ADR-0010); an own transition stays own even when it
    equals the default. Then "Back to automatic" as
    for the duration, toast "Transition back to automatic" with "Undo". At the last picture the
    eyebrow is "Transition", the state "Last picture", and a note says "**The slideshow ends
    here**, without a transition."; with an own transition stored it adds "The own transition
    “Dissolve” stays saved and applies again once a picture follows." and an enabled "Back to
    automatic".
