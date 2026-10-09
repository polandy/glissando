# Composing a slideshow

`src/compose/` makes the automatic ("good by default") choices that turn a `StoredSlideshow`
into the playable `Slideshow` JSON (`dev-docs/PLAYER.md`). Pure, framework-free functions; no
I/O, no subject detection.

- **Order**: an import sorts the pictures ascending by `capturedAt`; a tie breaks by file name,
  then input order. The stored order is always the play order; `ownOrder` only labels it as
  the user's own once they reordered the pictures.
- **Title**: the month, or month range, the pictures were captured in, formatted with
  `Intl.DateTimeFormat(locale, …).formatRange`; a title the user emptied falls back to it.
- **Durations** (`slideDurationsMs`): a picture's own duration (`StoredPicture.durationMs`,
  ADR-0008) is kept exactly. Without music, every other slide gets `secondsPerPicture`. With
  music, the pictures without an own duration share what the own durations leave of the music's
  excerpt (`musicExcerptMs`: the trim, or the whole track; ADR-0009) evenly (the remainder
  milliseconds go to the first of them, so the sum matches the excerpt exactly) — unless that share would fall below `MIN_SECONDS_PER_PICTURE` (or nothing is left),
  in which case each of them gets the minimum and the slideshow outlasts the music. When every
  picture has an own duration, the music plays no part in the timing.
- **Ken Burns**: zoom alternates in/out by slide index between `MIN_KEN_BURNS_ZOOM` and 1.2; a
  gentle horizontal pan alternates direction with it. A portrait picture's centre is raised
  toward where faces usually sit; a landscape picture's centre stays in the middle. Easing is
  always `linear`. A picture with an own motion (set in the picture editor, stored as
  `StoredPicture.kenBurns`, ADR-0006) plays that one instead, wherever it sits, with the same
  easing (`pictureKenBurns`): the automatic motion follows the position, an own one stays with
  its picture.
- **Caption**: a picture's caption (`StoredPicture.caption`) becomes its slide's `caption`; a
  picture without one gets none. There is no automatic caption.
- **Transitions** (`pictureTransition`): the automatic effect is the slideshow's default
  (`StoredSlideshow.transition`, absent: the crossfade; `automaticTransition`, ADR-0010). Only
  the default `"alternate"` cycles through `TRANSITION_EFFECTS` in order by position
  (`autoTransitionEffect`, so none repeats back to back); a default `"cut"` composes no
  transition. A picture's own transition (`StoredPicture.transition`, ADR-0008) replaces it wherever
  the picture sits; `"cut"` composes a slide without `transitionToNext`. The last slide has none
  (ADR-0002), even with an own one stored. A transition's duration, own effect or automatic, is
  30% of its slide's duration, capped at 1000 ms (`transitionDurationMs`).

- **Music** (`resolveMusicTiming`, ADR-0009): the music plays from the excerpt's start and is
  heard until the excerpt's end or the slideshow's, whichever comes first (`audibleEndMs`): a
  longer slideshow plays its last pictures in silence, a shorter one ends the music with it. An
  own fade (`StoredMusic.fadeInMs`, `fadeOutMs`, 0 being off) is kept; an automatic one is short
  (2 s) where the music is cut and off where the track starts or ends by itself: fade-in iff the
  excerpt starts after 0, fade-out iff the music stops before the track's end. Fades that
  together outlast what is heard are scaled down in proportion.

## Entry points

- `buildStoredSlideshow` applies the order and title to a fresh import.
- `composeSlideshow` turns a stored slideshow into the player's JSON, resolving picture and
  music ids to URLs through an injected `SlideshowSources`.
- `slideshowDurationMs` sums a stored slideshow's slide durations, own ones included, for a
  "12 pictures · 1:00" summary.

See `dev-docs/adr/0002-transitions-inside-slide-durations.md` for why a transition runs inside
its slide's duration, and `dev-docs/PLAYER.md` for the JSON contract these functions produce.
