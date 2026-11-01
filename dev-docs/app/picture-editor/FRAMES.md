# Frames, focus and changing a frame

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
- **Focus marker** (`focus-indication.ts`, `FocusMarker.svelte`): with the automatic motion,
  accent corner brackets mark the subject box it aims at, with a small chip above it naming what
  found it — "Face", "Subject" or "Immich" (below a box at the picture's top, right-aligned at
  its right edge); over the frames, never in the way of a drag. Found while the editor is open,
  the marker settles in (fades in from slightly larger; at once with reduced motion); a focus
  already known, on opening or on ‹/›, shows at once. An own motion hides the marker — its frames
  say where it goes — and brings it back at once if the motion returns to automatic.
- **Focus line** (`focus-indication.ts`, `FocusLine.svelte`): one quiet line at the end of the
  Ken Burns section (the dark picture area shows only the picture)
  for every state of the picture's focus search, each with its own action button next to it:
  not yet looked at ("Not looked at yet – it's in the queue.", "Look now"); searching (the
  existing pulsing-dot pill, no action); found — face, subject, Immich faces, scenery or no
  subject — with a small "Look again" text button; found by an older detector version ("… found by an
  older version – looking again soon.", "Look again now"); the look failed ("Couldn't look at
  this picture.", "Try again"); waiting on the server or Immich to look ("Waiting for your
  Glissando server to look at this picture.", no action). Every action calls the slideshow's
  focus pass's `lookAgain` for this picture alone and never touches its Ken Burns motion
  (ADR-0041). An own motion replaces a found result's sentence with its own: "Own motion – your
  start and end stay, whatever is found. The focus (‹result›) is used only if you go back to
  automatic." — the same action beside it; a process state (searching, failed, waiting on the
  server) shows as usual, since own motion changes only what a found result means, not whether
  the search itself is still running.
- **Changing a frame**: a drag anywhere on the picture (one pointer, past 8 px, counted from
  where it went down) moves the active frame by the pointer's travel; a corner resizes it about
  the opposite corner (shape kept), the wheel and two fingers anywhere zoom (at once, without
  the 8 px); on the focused frame the arrow keys move it by
  1 % (Shift 5 %), + and − zoom by 0.05. Zoom runs from 1 (the whole picture as far as it fills
  a 16:9 screen) to 3, and the frame never leaves the picture. A drag is stored when it ends,
  every other change at once.
