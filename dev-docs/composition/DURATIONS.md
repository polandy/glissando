# Durations

`slideDurationsMs` works per slide unit, not per picture. A composed pair counts as
`PAIR_WEIGHT` (1.5) of a single slide's share; a pair is always automatic, since a picture with
any own setting is never paired. A picture's own duration (`StoredPicture.durationMs`,
ADR-0008) is kept exactly, unless the music's beats move it (below). Without music, and with
music when `StoredSlideshow.pictureLength` is `"seconds"` (ADR-0022) or a mood is set
([MOOD](../app/slideshow-editing/MOOD.md), ADR-0045) and the music does not need fitting, every
other slide gets its target seconds (`secondsPerPicture`, or the mood's) times its weight. When
the pictures fill the music (`pictureLength` absent and no mood; `picturesFillMs`), the slides
without an own duration share what the own durations leave of the playlist (`playlistMs`: the
songs' excerpts — each the trim, or the whole track, ADR-0009 — summed, less the crossfades'
overlaps; ADR-0023) by weight
(the remainder milliseconds go to the first of them, so the sum matches the playlist exactly) —
unless that share would fall below `MIN_SECONDS_PER_PICTURE`, unweighted (or nothing is left), in
which case each of them gets the minimum and the slideshow outlasts the music; filling it or not
then makes no difference when every picture has an own duration.

## Fitting a shorter music

`picturesFillMs` (`src/compose/filled-length.ts`, ADR-0047) also decides, for own seconds and a
mood alike, whether a shorter playlist than the automatic pictures' target length should be
filled instead of leaving the last pictures in silence: when the automatic pictures, unweighted
after the own durations, would still get at least `MIN_SLIDE_DURATION_MS` or ⅔ of their target
seconds (whichever is larger — `FIT_SHRINK_FACTOR`), the playlist's length is returned so they
fill it, same as "Fill the music"; otherwise the target seconds are kept and the slideshow
outlasts the music. `StoredSlideshow.repeatMusic` set, or no playlist, always keeps the target:
a repeating playlist leaves no gap to fit, so the pictures keep their own or mood length. Nothing
is stored: the fit is worked out again on every composition.

## By the music's energy

With `energyPacing` set ([ENERGY_PACING](../app/slideshow-editing/ENERGY_PACING.md), ADR-0046),
the automatic slides' time is shared out again by the music's energy before the beat snap —
longer where it is quiet, shorter where it is loud, same total — and a boundary moves onto each
lift, where the slide ends with a cut.

## On the beat

ADR-0021. With the playlist's beats (`playlistBeatsMs`: each song's beats from `src/beats/`
strictly inside its excerpt, placed at the song's start in the playlist; inside a crossfade's
overlap only the incoming song's; a song with `pictureChanges` `"even"`, without a clear beat or
not listened to yet gives none), each boundary moves to the nearest beat — a phrase start, every
fourth beat of the list, within half a beat — that leaves the slide before it and the next
automatic one after it at least `MIN_SECONDS_PER_PICTURE` (`snapToBeats`), the difference taken
up by that next slide; else stays. An own duration moves the same way but only within half its
slack above the minimum either way of its set length, so it moves to about that long, not
exactly it. A boundary with no automatic slide left to absorb the difference — the playlist's
end when the pictures fill it, or an own duration the rest of the way to it — keeps its unsnapped
length instead, unless there is no automatic slide at all, when each own duration still moves
about its own length. Lasting their seconds, the last slide's end moves too, the same way: the
slideshow ends on a beat. No beat leaves the even, or exact, shares as they are.

The beats, and the energy and lifts above, are already in real playlist time — including an
opening title card or a trip chapter's own time, composed afterwards
([TITLE_CARD_COMPOSITION](../player/TITLE_CARD_COMPOSITION.md),
[TRIP_CHAPTERS](../player/TRIP_CHAPTERS.md)). `composeSlideshow` works out that time first
(`insertedTimeFor`) and passes it into `slideDurationsMs`, so a boundary snaps to the beat it
really falls on, not the beat it would fall on without the card or chapter.
