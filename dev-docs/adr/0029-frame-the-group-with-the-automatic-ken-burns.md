# ADR-0029: The automatic Ken Burns frames the group, not one face

**Status:** accepted

## Context

ADR-0012 stores one box per picture — the face with the largest score-weighted area — and the
automatic motion aims at its centre. In a group photo the frame at the largest zoom (1.2, a
window of 83% of the picture) then easily cuts the other people off. Wanted: see the people as
one unit where the picture allows. Open points were what to do when the group does not fit the
window, and whether small background faces count.

## Decision

- **The stored focus box is the group's box.** The anchor face (pico: the largest
  score-weighted area as before; Immich: the largest area) plus every other face whose edge
  (√ of its box area) is at least 35% of the anchor's, as the smallest box around them
  (`groupFocusBox`, `MIN_RELATIVE_FACE_EDGE`). Both detectors use it, so the `focus` store keeps
  its shape — `{kind: "subject", box}` — and nothing needs a migration, the editor's marker simply
  surrounds the group.
- **A group that does not fit lowers the zoom.** `autoKenBurns` takes the larger side of the box,
  grown by 15%, as the window the largest zoom must show: the motion's end zoom is
  `min(1.2, 1 / that)`, never below `MIN_KEN_BURNS_ZOOM`. A group across the whole picture
  therefore gets zoom 1 at both ends and only the pan. The window is taken as 1/zoom of the
  picture on both axes, since the screen is not known when the slideshow is composed; with a
  picture and a screen of different shapes the cover crop is tighter than that on one axis.
- **Everything else stays**: centre on the box's centre, the alternating zoom and pan, the pair
  halves' no-pan rule (ADR-0028), an own motion replacing the automatic one (ADR-0006).

## Options weighed

- _The largest subgroup that fits at zoom 1.2_ — livelier, but cuts people on the edge whenever
  the group is wide, which is what this removes.
- _Aim at the group's middle at zoom 1.2_ — the simplest rule, and the one that crops the outer
  faces.
- _Store every face and decide at composition_ — a new record shape and a migration for a choice
  the box already carries; the threshold would also need the faces' sizes at every compose.
- _Every face counts_ — passers-by and false hits widen the group until the motion stops zooming.

## Consequences

- ADR-0012's measurement found that aiming at the union of all detections hit a tagged face less
  often than aiming at the strongest one. That was about where the centre lands, not about
  showing everyone; the 35% rule keeps the box near its anchor, and the zoom drops rather than
  the centre drifting off a face.
- Pictures whose focus was stored earlier keep their single-face box until the focus store is
  cleared; Glissando has no live instance to migrate.
- Large groups get a quieter motion: the less room, the less zoom.
