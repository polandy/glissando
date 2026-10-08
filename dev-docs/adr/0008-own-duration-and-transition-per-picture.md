# ADR-0008: A picture's own duration and transition are optional fields on the stored picture

**Status:** accepted

## Context

The picture editor (roadmap 1, `dev-docs/SCOPE.md`) lets the user give a picture its own
duration and its own transition. Until then every duration follows the slideshow
(`secondsPerPicture`, or the music's length split evenly) and every transition cycles
automatically by position (`dev-docs/COMPOSITION.md`). Three questions need an answer: where the
choice is stored, which picture a transition belongs to, and how own durations meet a slideshow
timed to its music.

## Decision

`StoredPicture` gains an optional `durationMs` (whole ms, 2 to 15 s in half-second steps) and an
optional `transition` (`TRANSITION_CHOICES`: the player's six effects or `"cut"`), following
ADR-0006: absent means automatic, "back to automatic" deletes the field, both are validated
where they enter (`setPictureDuration`, `setPictureTransition` and the `.glissando` reader), and
the player's JSON is unchanged.

- **A transition belongs to the picture it leaves**, as the player's `transitionToNext` does: it
  runs at the end of that picture's slide (ADR-0002). The last picture keeps a stored choice but
  plays none.
- **With music, the pictures without an own duration share the rest of the track** evenly, never
  below the minimum; when every picture has an own duration, the music plays no part in the
  timing.
- **A transition's length is derived, not stored**: 30% of its slide's duration, at most 1 s,
  for an own effect as for an automatic one.

The `.glissando` format goes to version 4, which may carry both fields; versions 1 to 3 are
still read.

## Options weighed

- _The transition on the incoming picture, as PowerPoint does_ — rejected: the previous
  picture's duration would set its length, the first picture would need a special case, and the
  stored field would no longer match the player's `transitionToNext`.
- _With music, scale every duration to the track_ — rejected: an own 8 s would no longer be 8 s.
- _With music, ignore the track once any picture has an own duration_ — rejected: every own
  duration would shift where the slideshow ends against its music.
- _Store the transition's length with its effect_ — rejected: shortening the picture's duration
  afterwards could leave a transition longer than its slide, which the player's parser rejects.

## Consequences

- Own durations and transitions stay with their picture through reorder, removal and undo, as
  an own motion does.
- A slideshow with own durations may outlast its music (the automatic share falls to the
  minimum) or end before it (every picture has an own duration).
- Every `.glissando` file is written as version 4; an older app reports it as coming from a
  newer version.
- Records in IndexedDB need no migration: a record without the fields is all automatic.
