# Rename, transitions, portrait pictures and delete

- **Rename**: ✎ turns the title into a field (at most 80 characters): Enter or leaving it
  saves, Esc cancels, an empty title falls back to the automatic one from the capture dates.
- **Transitions** (`slideshow/TransitionsSheet.svelte`, ADR-0010): the info panel's
  transitions row opens a modal sheet "Slideshow transitions" (bottom sheet up to 720 px wide,
  a centred dialog above, over a scrim) with the state "Default" or, accent-tinted, "Own
  choice". A radiogroup of eight tiles in four columns — Crossfade, Push, Wipe, Circle, Zoom,
  Dissolve, Cut, Alternating — each looping its effect from the first picture to the second
  (the only picture twice when there is one; "Alternating" shows the next effect each loop;
  still with reduced motion), the picture editor's `TransitionTile`. Crossfade carries the
  tag "Default"; while it applies, the checked outline is dashed. A tap stores the choice at
  once; the arrow keys move it (selection follows focus). The hint: "Every transition:
  Dissolve. It takes 30 % of the picture's time, at most 1 s.", for a cut "The pictures follow
  one another without a transition.", for alternating "The effects alternate from picture to
  picture, never the same one twice in a row." A note names the pictures that keep an own
  transition: "Pictures 5 and 7 keep their own transitions – change them in the picture
  editor." Then "Back to crossfade" (disabled-looking and titled "The transitions are already
  set to crossfade" while they are; the toast "Transitions back to crossfade" with "Undo"
  follows) and "Done". Done, Esc or a tap on the scrim closes it; focus starts on the checked
  tile and goes back to the row.
- **Portrait pictures** (`slideshow/PortraitPicturesSheet.svelte`, ADR-0028): the info panel's
  portrait pictures row opens a modal sheet "Portrait pictures" with the state "Default" or,
  accent-tinted, "Own choice". Three radio tiles, each with a tiny diagram and a hint:
  "Automatic" (two consecutive portrait pictures side by side; a lone one a wide screen would
  crop a lot gets a blurred fill instead), "One at a time" (every picture shown alone; a
  mismatched one gets a blurred fill), "Fill the screen" (every picture crops to cover, as
  before: no pairs, no blurred fill). Picking "Automatic" resets the setting rather than
  storing it, since automatic is the setting's absence; the other two store at once. A note:
  "Pictures with an own motion, duration, caption or transition, or set to always alone, are
  shown alone." Then "Back to automatic" (disabled-looking and titled "Portrait pictures are
  already set to automatic" while they are; the toast "Portrait pictures back to automatic"
  with "Undo" follows) and "Done". Done, Esc or a tap on the scrim closes it; focus starts on
  the checked tile and goes back to the row.
- **Delete**: "Delete slideshow …" asks in a dialog, "Delete “title”?", what goes (the
  slideshow and its n pictures, not the original photos; cannot be undone), "Keep" (focused)
  and a coral "Delete"; Keep or Esc puts the focus back on the ⋯ button. Deleting first closes
  the screen's undo toast, then removes the record and the media only it uses, goes back to
  start and shows the toast "Slideshow deleted" there — also when another tab deleted it
  first. An edit to a slideshow deleted elsewhere goes back to start with the toast "This
  slideshow no longer exists."
