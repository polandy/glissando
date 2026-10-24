# Energy pacing

The switch "Follow the music's energy" in the Mood sheet. Pictures stay longer in quiet passages
and change quicker in loud ones, and a drop or chorus (a _lift_) gets a cut on its beat
(ADR-0046). Mockup, option A, cut at the drop, off by default:
`https://polandy.github.io/glissando-assets/mockups/energy-pacing/`.

## Energy curve

`src/compose/energy/` is pure and works in ms of the playlist.

- **Short-term loudness** `S(t)` of a song: the mean of `blockMeanSquares` over the blocks
  starting in `[t − 1500, t + 1500 − LOUDNESS_BLOCK_MS]`, clipped to the excerpt, in LUFS;
  silence is floored at the absolute gate (−70 LUFS).
- **Energy** `e(t) = clamp(0.5 + (S(t) − I) / ENERGY_RANGE_LU, 0, 1)`, where
  `I = excerptLoudnessLufs` of that song's excerpt and `ENERGY_RANGE_LU = 12`.
- **Playlist**: each song is placed like `playlistBeatsMs` (`placeSongs`); inside an overlap the
  incoming song counts. Outside any song, and for a song that is `pictureChanges: "even"`, was not
  measured, or has `I = null`: `e = NEUTRAL_ENERGY` (0.5) and no lifts.
- A slide's energy is the mean of `e` sampled every `LOUDNESS_HOP_MS` over its span.

## Lifts

Per song, over its excerpt, sampled every `LOUDNESS_HOP_MS`:

- **Before and after**: `B(t)` is the mean loudness (LUFS of the mean of the mean squares) over
  `[t − LIFT_WINDOW_MS, t)`, and `A(t)` the same over `[t, t + LIFT_WINDOW_MS)`, where
  `LIFT_WINDOW_MS = 4000`.
- **Where a lift is**: `t` is a lift when all of these hold:
  - `A(t) − B(t) ≥ LIFT_RISE_LU` (6);
  - `A(t) ≥ I`;
  - the rise is a local maximum, with the earliest of equal values winning;
  - `t ≥ excerpt start + LIFT_WINDOW_MS` and `t ≤ excerpt end − LIFT_WINDOW_MS`;
  - `t` is at least `LIFT_MIN_GAP_MS` (20 000) after the previous lift. The larger rise wins a
    conflict; on a tie, the earlier one.
- **On the beat**: the lift moves to the nearest beat of the song's excerpt, if it has beats. The
  lifts are returned in playlist ms, ascending.

## Pacing

`slideDurationsMs(pictures, filledMs, secondsPerPicture, beatsMs?, energy?)`, where `energy` is
`PlaylistEnergy { energyAt(ms), meanEnergy(fromMs, toMs), liftsMs }`.

1. The usual durations, as before: own durations, `secondsPerPicture × weight`, or the filled
   music's even split.
2. **Weights** (`paceByEnergy`): three passes (`ENERGY_PASSES`). Each pass weights every
   automatic slide by `usual × ENERGY_SPREAD ^ (1 − 2·meanEnergy(span))`, with
   `ENERGY_SPREAD = 1.5`, using the spans of the previous pass. The automatic total is then
   shared out by those weights, in whole ms, with the remainder going to the first slides. If any
   share falls below `MIN_SECONDS_PER_PICTURE`, the usual durations are kept. Own durations never
   change.
3. **Lifts** (`cutAtLifts`): for each lift, the nearest boundary between two automatic slides
   moves onto it, if both stay at or above the minimum. Otherwise the lift is skipped.
4. **Beats**: `snapToBeats` as before. A boundary on a lift is already on a beat and stays.

The slideshow's total length is the same as without energy, before the beat snap.

## Composing

When `stored.energyPacing` is set, `composeSlideshow` builds the `PlaylistEnergy` from
`loudness` and `beats` and passes it to `slideDurationsMs`. A slide whose end lands exactly on a
lift gets no `transitionToNext` (a cut), unless its picture has an own transition. Every other
caller that shows per-picture times passes the same energy:

- `picture-durations-ms`;
- `slideshow-duration-ms`;
- the picture editor;
- the music editor;
- after adding pictures;
- the import view.

The composed player JSON carries no new field.

## UI

- **Switch** in the Mood sheet, under the tiles: "Follow the music's energy", with "Slower when
  it's quiet, quicker when it's loud, a strong change at a drop" underneath. It is a
  `role="switch"` that stores at once, like a mood tile. It is shown under every
  mood, Custom included.
- **What it sets**, with the switch on:
  - "Picture times" shows the range of the automatic slide durations, as "5 s – 10 s · by
    energy" (to 0.1 s, a trailing ".0" dropped), or as usual when they are all equal;
  - an extra row, "At a drop or chorus", shows "Cut on the beat" when a lift was found.
- **Hint** with the switch on: under a mood, "The mood sets the average pace; the energy makes it
  slower in quiet passages and quicker in loud ones. Pictures with their own duration, transition
  or motion keep them."; under Custom, "Your picture times stay the average. With “Fill the
  music” the slideshow still ends with the song. Pictures with their own duration keep it."
- **Energy strip** (`EnergyStrip.svelte`), under the preview while the switch is on:
  - the energy curve of the whole slideshow as an area;
  - a tick at every picture change;
  - a dashed line at every lift;
  - the stretch the preview plays, shaded;
  - a playhead inside that stretch;
  - "quiet → longer" and "loud → quicker" underneath.

  It is decorative (`aria-hidden`); the "What it sets" rows say the same in words.
- **Preview**: with the switch on and a lift found, the preview plays the four slide units around
  the first lift (two before, two after) instead of the first four. The badge adds "· energy".
- **Info panel**: under a mood, "Picture times" shows the same range "· by energy"; under Custom,
  "follows the energy" goes underneath the value.

## Stored

`StoredSlideshow.energyPacing?: true` (`setSlideshowEnergyPacing`; `false` deletes the field).
It is validated by the `.glissando` reader from format 20 (`ENERGY_PACING_FROM_VERSION`) and by
the server document reader from version 6. Older files have no such key, and a newer key in an
older format is rejected like any unknown key.
