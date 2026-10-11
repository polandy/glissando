# Transition

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
