# ADR-0010: The slideshow's default transition is an optional field on the stored slideshow

**Status:** accepted

## Context

Every picture without an own transition (ADR-0008) cycled through the player's six effects by
position. Owners of a calm slideshow wanted one effect throughout, mostly the crossfade, and
had to set it picture by picture. The slideshow screen's info panel gets a "Transitions" row
that opens a sheet of eight choices: the six effects, the cut and "Alternating", the cycle.
Three questions need an answer: where the choice is stored, what existing slideshows and files
become, and what the player is told.

## Decision

`StoredSlideshow` gains an optional `transition`: one of `SLIDESHOW_TRANSITIONS`, the picture
choices (`TRANSITION_CHOICES`) plus `"alternate"`. Absent means the crossfade
(`DEFAULT_SLIDESHOW_TRANSITION`); choosing the crossfade, or "Back to crossfade", deletes the
field. The value is validated where it enters (`setSlideshowTransition` and the `.glissando`
reader, `checkSlideshowTransition`).

- **A picture without an own transition plays the default** (`automaticTransition`); only
  `"alternate"` keeps the cycle by position (`autoTransitionEffect`), and `"cut"` composes no
  transition. A picture's own transition still overrides it, and the last slide still has none
  (ADR-0002, ADR-0008).
- **The player's JSON is unchanged**: composing resolves each slide's `transitionToNext` as
  before.
- **Changing the default never touches own transitions**, even one equal to the new default.
- **No migration**: records and files without the field are crossfade, so existing slideshows
  switch from alternating to the crossfade.

The `.glissando` format goes to version 6, whose `slideshow` may carry `transition`; versions 1
to 5 are still read, without the field.

## Options weighed

- _Existing slideshows keep alternating_, through a library migration that writes
  `"alternate"` and by reading files of versions 1 to 5 as alternating — rejected: a permanent
  special case in the reader plus a migration, for an app not yet shipped to others; one tap on
  "Alternating" restores the cycle.
- _Store the default in the player's JSON and resolve it in the player_ — rejected: the player
  stays a renderer of resolved slides; every automatic choice is made while composing.
- _Store `"crossfade"` explicitly_ — rejected: absent means automatic, as for the own motion,
  duration and transition (ADR-0006, ADR-0008); two spellings of the same state would need
  normalising everywhere.

## Consequences

- Picking a tile stores at once; "Back to crossfade" offers an undo, as the picture editor's
  resets do.
- The picture editor's "Auto" tile is the slideshow's default; its hint names it.
- Every `.glissando` file is written as version 6; an older app reports it as coming from a
  newer version.
- Records in IndexedDB need no migration.
