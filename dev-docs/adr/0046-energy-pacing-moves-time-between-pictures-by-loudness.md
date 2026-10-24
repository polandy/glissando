# ADR-0046: Energy pacing moves time between pictures by the music's loudness, and cuts at a lift

**Status:** accepted

## Context

The owner's roadmap (`TODO.md`) asks to pace a slideshow by the music's energy. Pictures should stay longer in quiet passages and
change quicker in loud ones, and a drop or chorus should get a stronger change. Mockup, option A:
`https://polandy.github.io/glissando-assets/mockups/energy-pacing/`. Beats and phrases come from
the own detector (ADR-0021) and the pace from a mood or the single settings (ADR-0045, ADR-0022).
Four things need deciding: what "energy" is measured from, how it relates to moods, Custom, "fill
the music" and a picture's own values, what a drop is and what happens there, and where it is
worked out.

## Decision

- **Energy is the short-term loudness the device already stores.** Every song's
  `MusicLoudness` (ADR-0040) holds K-weighted 400 ms blocks every 100 ms, stored on the device
  and on the server. Energy is the 3 s short-term loudness around a moment, relative to the
  excerpt's integrated loudness: `e = clamp(0.5 + (S − I) / 12 LU, 0, 1)`. It is worked out when
  composing, with no new analysis, no new store, no new dependency and no change to the beat
  worker. A song whose picture changes are `"even"`, or which was not measured yet, counts as a
  flat 0.5 with no lifts.
- **A switch, beside the mood, not a mood.** `StoredSlideshow.energyPacing` (`true`, absent when
  off — off by default) applies under Calm, Lively and Custom alike. Leaving a mood or choosing
  "Back to Custom" leaves the switch as it is.
- **It moves time between pictures; it never changes how long the slideshow is.** The pictures
  without an own duration first get their usual lengths: the mood's seconds, the own seconds, or
  their share of the music when it is filled. Each then gets the weight
  `usual × 1.5^(1 − 2e)`, where `e` is the mean energy over its span. Quiet (`e = 0`) gives 1.5×
  and loud (`e = 1`) gives 0.67×. Their total is then shared out again by those weights. Positions
  move with the lengths, so this runs three fixed passes. If a share would fall below
  `MIN_SECONDS_PER_PICTURE`, the usual lengths are kept. "Fill the music" therefore still ends
  with the music, and a mood keeps its average pace.
- **A picture's own values always win** (ADR-0008). Own durations are neither weighted nor moved
  to a lift. An own transition stays at a lift.
- **A lift is a jump into a loud passage.** It is where the mean loudness of the next 4 s is at
  least 6 LU above that of the previous 4 s, the next 4 s are at or above the excerpt's
  integrated loudness, and the rise is a local maximum. It is not within the excerpt's first
  4 s, and it is at least 20 s after the previous lift. It moves to the nearest beat of its song,
  if the song has beats.
- **At a lift, a cut.** The automatic boundary nearest to each lift moves onto it. Both slides
  must be automatic and stay at or above the minimum, or the lift is skipped. The beat snap then
  leaves that boundary where it is, because it is already on a beat. The slide that ends there
  has no transition, so the next picture cuts in on the beat, unless that slide's picture has an
  own transition.
- **No player change.** Durations and transitions are already resolved in the composed JSON. The
  `.glissando` format goes to version 20 and the server document to version 6, both with an
  optional `energyPacing`. There is no migration.

## Options weighed

- _A fourth mood "Flowing"_ (mockup option B) — rejected: one tap, but Calm, Lively and Custom
  could never follow the energy, and "Flowing" would have to invent its own blend of two moods.
- _Per song in the music editor_ (option C) — rejected: it sits far from the Mood sheet that sets
  the pace, and one slideshow could mix both behaviours.
- _A new energy analysis in the beat worker_ (keeping the onset-strength curve) — rejected: the
  stored loudness already says how loud each moment is, and onset strength is a different thing
  (busy hi-hats, not a loud chorus). A new analysis would also mean a new stored field, server
  validation and a re-detection of every song.
- _Let the energy change the slideshow's length_ (each picture `seconds × factor`, no
  re-sharing) — rejected: a loud song would make the slideshow shorter and "fill the music" would
  stop ending with the music.
- _Pace by the absolute loudness_ — rejected: a mastered pop song and a quiet piano piece would
  pace at opposite ends. Relative to the song's own integrated loudness, each song has its own
  quiet and loud parts.
- _A flash or a quick zoom at a lift_ — a flash needs a new effect in the player and the export;
  a zoom is softer. The owner chose the cut.

## Consequences

- No new analysis runs: a slideshow follows the energy as soon as its songs' loudness is
  measured, which the levelling (ADR-0040) needs anyway. Until then it plays at the usual pace.
- The thresholds (12 LU range, 1.5 spread, 6 LU over 4 s) were chosen on generated music, like the
  beat detector's. Real recordings may need them tuned, and that changes only the constants in
  `src/compose/energy/`.
- Everything that shows per-picture times (the picture editor, the music editor, after adding
  pictures) goes through `slideDurationsMs` with the same energy, so it agrees with the player.
  The slideshow's total length is unchanged by design, apart from the beat snap.
