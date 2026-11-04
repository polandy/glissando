# Timing

- **Timing** (`TimingSection.svelte`): below the caption, the eyebrow "Timing" with the state
  "Automatic" or "Chosen" (accent-tinted; chosen when the picture's length or its transition
  is chosen), then the picture length, the transition and one full-width "Back to automatic".
- **Picture length** (`PictureLengthSlider.svelte`): a native range slider from 2 to 15 s in
  half-second steps (the own-timing constants), `aria-label` "Picture length", `aria-valuetext`
  in seconds. The value shows live beside the sub-heading while dragging and is stored on
  release (`change`); the scale below reads "2 s · 5 · 10 · 15 s" and a mark shows the automatic
  length when it is known (a slideshow without music). The slider is 44 px high under a coarse
  pointer. Moving it makes the length the picture's own, also from an automatic length off the
  half-second grid (shared music can leave it off). The hint follows the case: without music
  "Follows the slideshow's picture length." or, chosen, "Automatic would be 5.0 s."; with music
  "Follows the music: 4.6 s." or, chosen, "The other 7 pictures now
  show 4.6 s each." or, when the chosen picture lengths use up the music, "The other 7 pictures now show
  only 2.0 s each, the shortest they can." or, when every picture has a chosen one, "Every picture has
  a chosen picture length; the music sets none of them." Each hint says what the viewer sees,
  never how the music is shared. The count is of pictures; "each" is a single slide's share, a
  portrait pair's slide getting 1.5 times it, and "the shortest they can" means that share fell
  below the minimum (ADR-0028). A paired picture shows its pair's length.
  How durations share the music: `dev-docs/COMPOSITION.md`.
- **Transition** (`TransitionPicker.svelte`): the sub-heading "Transition to picture 6"; a
  radiogroup of seven tiles in four columns — Crossfade, Push, Wipe, Circle, Zoom, Dissolve,
  Cut — each looping its effect from this picture to the next in a small 16:9 frame (Cut: a hard
  switch, with a slash), still half-way with reduced motion. The applied choice has an accent
  outline, dashed while automatic, and the automatic effect carries an "Auto" tag; tiles carry no
  other badge. Tapping any tile, also the automatic one, makes it the picture's own; the arrow
  keys move the choice (selection follows focus, one tab stop). The hint: "Crossfade to
  picture 6, 1.0 s." or, for a cut, "Picture 6 follows
  without a transition.", while automatic prefixed by "Automatically, the slideshow's transition
  applies: Crossfade." or, for an alternating default, "Automatically, the transitions alternate,
  as set for the slideshow." (E2E-116) The automatic choice is the slideshow's default (ADR-0010); an own
  transition stays own even when it equals the default. At the last picture the sub-heading is
  "Transition", the state "Last picture", and a note says "**The slideshow ends here**, without
  a transition."; with a chosen transition stored it adds "The chosen transition “Dissolve” stays
  saved and applies again once a picture follows."
- **Back to automatic**: one button for both settings, disabled-looking and titled "The timing
  is already automatic" while both are automatic. It drops the own length and the own transition
  in one change and raises one toast "Timing back to automatic" with "Undo", which restores
  both. A newer edit of either setting ends the pending undo, so it never overwrites it.
