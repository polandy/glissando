# Composing a slideshow

`src/compose/` makes the automatic ("good by default") choices that turn a `StoredSlideshow`
into the playable `Slideshow` JSON (`dev-docs/PLAYER.md`). Pure, framework-free functions; no
I/O, no subject detection.

- **Order**: an import sorts the pictures ascending by `capturedAt`; a tie breaks by file name,
  then input order. The stored order is always the play order; `ownOrder` only labels it as
  the user's own once they reordered the pictures.
- **Title**: the month, or month range, the pictures were captured in, formatted with
  `Intl.DateTimeFormat(locale, …).formatRange`; a title the user emptied falls back to it.
- **Durations**: with music, the track's length splits evenly across the pictures (the
  remainder milliseconds go to the first slides, so the sum matches the track exactly) — unless
  that split would fall below `MIN_SECONDS_PER_PICTURE`, in which case every slide gets the
  minimum and the slideshow outlasts the music. Without music, every slide gets
  `secondsPerPicture`.
- **Ken Burns**: zoom alternates in/out by slide index between `MIN_KEN_BURNS_ZOOM` and 1.2; a
  gentle horizontal pan alternates direction with it. A portrait picture's centre is raised
  toward where faces usually sit; a landscape picture's centre stays in the middle. Easing is
  always `linear`. A picture with an own motion (set in the picture editor, stored as
  `StoredPicture.kenBurns`, ADR-0006) plays that one instead, wherever it sits, with the same
  easing (`pictureKenBurns`): the automatic motion follows the position, an own one stays with
  its picture.
- **Transitions**: effects cycle through `TRANSITION_EFFECTS` in order (so none repeats back to
  back); the last slide has none (ADR-0002). A transition's duration is 30% of its slide's
  duration, capped at 1000 ms.

## Entry points

- `buildStoredSlideshow` applies the order and title to a fresh import.
- `composeSlideshow` turns a stored slideshow into the player's JSON, resolving picture and
  music ids to URLs through an injected `SlideshowSources`.
- `slideshowDurationMs` sums a stored slideshow's slide durations, for a "12 pictures · 1:00"
  summary.

See `dev-docs/adr/0002-transitions-inside-slide-durations.md` for why a transition runs inside
its slide's duration, and `dev-docs/PLAYER.md` for the JSON contract these functions produce.
