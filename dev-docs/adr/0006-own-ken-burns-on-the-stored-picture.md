# ADR-0006: A picture's own Ken Burns motion is an optional field on the stored picture

**Status:** accepted

## Context

The picture editor (roadmap 1, `dev-docs/SCOPE.md`) lets the user set a picture's Ken Burns
motion by hand: a start and an end framing. Until then every motion is automatic, composed from
the picture's position at play time (`dev-docs/COMPOSITION.md`), so a reorder or a better
automatic rule (roadmap 2) reaches every picture. The own motion has to be stored, survive a
reorder, a removal and its undo, and travel in a `.glissando` file; "back to automatic" has to
bring the automatic motion back.

## Decision

`StoredPicture` gains an optional `kenBurns: { from, to }`, two framings as in the player's JSON
(zoom 1 to `MAX_OWN_KEN_BURNS_ZOOM` = 3, centre 0..1). Absent means automatic; "back to
automatic" deletes the field. `composeSlideshow` uses the field when present and the automatic
motion otherwise; the easing stays the automatic one (linear), so it is not stored. The player's
JSON is unchanged. The field is validated where it enters: the edit that sets it
(`setPictureKenBurns`) and the `.glissando` reader. The `.glissando` format goes to version 2,
which may carry the field; version 1 files are still read.

## Options weighed

- _Materialise every framing at import, plus an "own" flag_ — the library would already hold the
  finished JSON; rejected because it freezes the automatic choice: a reorder and a better
  automatic rule would no longer reach unedited pictures, and "back to automatic" would need the
  automatic rule anyway.
- _A separate `kenBurnsOverrides` map on the slideshow, keyed by picture id_ — keeps the picture
  record as imported; rejected because two places must then stay in sync on remove, undo and
  export, and a removed picture leaves an orphan entry behind.

## Consequences

- An own motion stays with its picture through reorder, removal and undo for free: it is part of
  the picture record that moves.
- Every `.glissando` file is written as version 2, even without an own motion: an older app
  reports such a file as coming from a newer version instead of calling it damaged.
- Records in IndexedDB need no migration: a record without the field is all automatic.
- A picture's caption follows the same pattern: an optional `caption`, `.glissando` version 3
  (how it is drawn: ADR-0007).
- A picture's own duration and transition follow it as well: `.glissando` version 4 (ADR-0008).
