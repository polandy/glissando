# ADR-0037: Scenery is found by a sky and colour heuristic, not by a scene network

**Status:** accepted

## Context

A picture with no face and no object (ADR-0012, ADR-0036) plays the middle-of-the-picture
motion. A view of a coast, a valley or a field has no one thing to aim at; it wants a slow wide
sweep across it instead. Which pictures are scenery is a label of the whole picture, not a box.

## Decision

- **A heuristic on the stored thumbnail** (`src/focus/scenery-focus.ts`): the picture is at
  least 1.3 times wider than high, and either
  - at least 60 % of its pixels are the colours of nature (hue from yellow-green to blue,
    saturated, not black): foliage, grass, sea; no sky needed; or
  - its upper third is calm (a mean luminance step of at most 6 per pixel), the rest changes at
    least twice as much as that third (and at least 8), and the third is clearly blue, or bright
    above a ground that is at least a quarter nature-coloured.

  Nothing is downloaded and it costs a few milliseconds.

- **Last in the order** face, object, scenery, middle: a picture with a person or an animal
  aims at it, even with a sky behind.
- **Stored as `{kind: "scenery"}`** beside `subject` and `none`; no box, so the editors' focus
  mark treats it as "no subject".
- **The motion** (`auto-ken-burns.ts`): a steady zoom of 1.3 and a pan from one edge of the
  picture to the other, direction alternating by slide index. In a composed pair's half
  (ADR-0028) there is no sideways pan, as for every motion.

## Options weighed

- _A scene classifier (Places365 and the like)_ — recognises more kinds of scenery (a night
  sky, a mountain in fog), but is another network of 10 MB or more, 365 classes of which we
  need one answer, and a licence to check for each; against a motion that is only a pleasant
  default.
- _The object network's absence as the signal_ — every picture with nothing found would sweep,
  portraits of objects it misses included.

## Consequences

- The heuristic misses scenery that is neither mostly green or blue nor under a calm sky (a
  desert, a snowfield, a dusk view) and takes a green or blue room (a painted wall) for
  scenery. A miss plays the middle motion as before; a false hit sweeps a picture that did not
  need it. Both cost little.
- The thresholds are not fitted to a data set; if they prove wrong in use, a scene network can
  replace `sceneryFocus` behind the same `PictureFocus` value.
- There is no migration: a picture stored as "none" stays so until the focus store is cleared.
