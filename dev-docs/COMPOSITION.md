# Composing a slideshow

`src/compose/` makes the automatic ("good by default") choices that turn a `StoredSlideshow`
into the playable `Slideshow` JSON (`dev-docs/PLAYER.md`). Pure, framework-free functions; no
I/O, no subject detection.

- **Order**: an import sorts the pictures ascending by `capturedAt`; a tie breaks by file name,
  then input order. The stored order is always the play order; `ownOrder` only labels it as
  the user's own once they reordered the pictures.
- **Title**: the month, or month range, the pictures were captured in, formatted with
  `Intl.DateTimeFormat(locale, …).formatRange`; a title the user emptied falls back to it.
- **Portrait pictures** (`slideUnits`, ADR-0028): two consecutive portrait pictures (height >
  width) compose into one slide unit — `Slide.partner` — greedily from the start, never
  reordering, unless either has an own setting (motion, caption, duration, transition), is a video
  (`StoredPicture.video`) or is marked `StoredPicture.alone`. `StoredSlideshow.portraitPictures` `"one-at-a-time"` composes no
  pairs; `"fill-screen"` composes no pairs and gives every slide `Slide.fit` `"cover"`; absent is
  automatic (pairs, and a blurred fill for a whole picture the player draws instead of cropping
  it). `slideOfPicture` maps a picture's index to the slide unit that holds it, for UI that shows
  a picture's own timing; a paired picture shows its pair's. E2E-045 plays a pair side by side
  and splits it with "always alone" and the "fill the screen" setting.
- **Video slides** (`StoredPicture.video`, ADR-0034, [VIDEO_SLIDES](player/VIDEO_SLIDES.md)): the
  slide carries `video` (`src` from `SlideshowSources.video(mediaId)`, `volume` as 0 to 1,
  `duckMusic` written only when `false`), a still framing instead of any Ken Burns, and its
  poster as `image`. Its duration is `endMs − startMs`, an own duration (ADR-0008) that is never
  snapped to the beats; the picture's `durationMs` is not used. Caption and transition follow the
  picture's rules.
- **Durations** (`slideDurationsMs`): works per slide unit, not per picture. A composed pair
  counts as `PAIR_WEIGHT` (1.5) of a single slide's share; a pair is always automatic, since a
  picture with any own setting is never paired. A picture's own duration (`StoredPicture.durationMs`,
  ADR-0008) is kept exactly, unless the music's beats move it (below). Without music, and with
  music when `StoredSlideshow.pictureLength` is `"seconds"` (ADR-0022), every other slide gets
  `secondsPerPicture` times its weight. When the pictures fill the music (`pictureLength` absent;
  `filledMusicMs`), the slides without an own duration share what the own durations leave of the
  playlist (`playlistMs`: the songs' excerpts — each the trim, or the whole track, ADR-0009 —
  summed, less the crossfades' overlaps; ADR-0023) by weight (the remainder milliseconds go to the
  first of them, so the sum matches the playlist exactly) — unless that share would fall below
  `MIN_SECONDS_PER_PICTURE`, unweighted (or nothing is left), in which case each of them gets the
  minimum and the slideshow outlasts the music; filling it or not then makes no difference when
  every picture has an own duration. **On the beat** (ADR-0021): with the playlist's beats
  (`playlistBeatsMs`: each song's beats from `src/beats/` strictly inside its excerpt, placed at
  the song's start in the playlist; inside a crossfade's overlap only the incoming song's; a song
  with `pictureChanges` `"even"`, without a clear beat or not listened to yet gives none), each
  boundary moves to the nearest beat — a phrase start, every fourth beat of the list, within half
  a beat — that leaves the slide before it and the next automatic one after it at least
  `MIN_SECONDS_PER_PICTURE` (`snapToBeats`), the difference taken up by that next slide; else
  stays. An own duration moves the same way but only within half its slack above the minimum
  either way of its set length, so it moves to about that long, not exactly it. A boundary with no
  automatic slide left to absorb the difference — the playlist's end when the pictures fill it, or
  an own duration the rest of the way to it — keeps its unsnapped length instead, unless there is
  no automatic slide at all, when each own duration still moves about its own length. Lasting
  their seconds, the last slide's end moves too, the same way: the slideshow ends on a beat. No
  beat leaves the even, or exact, shares as they are.
- **Ken Burns**: zoom alternates in/out by slide index between `MIN_KEN_BURNS_ZOOM` and 1.2; a
  gentle horizontal pan alternates direction with it. The motion swings around the picture's
  focus — the centre of the subject box the on-device detection found (`PictureFocus`,
  ADR-0012), each pan end kept inside the picture. The box surrounds the whole group (ADR-0029),
  so when it is wider or taller than the frame at zoom 1.2 (its larger side grown by 15%) the
  motion's largest zoom drops until it fits, down to 1. Without a subject (nothing found, or not
  looked at yet) a portrait picture's centre is raised toward where faces usually sit and a
  landscape picture's stays in the middle. Easing is always `linear`. A picture with an own motion (set in the picture editor, stored as
  `StoredPicture.kenBurns`, ADR-0006) plays that one instead, wherever it sits, with the same
  easing (`pictureKenBurns`): the automatic motion follows the position, an own one stays with
  its picture. A composed pair's two halves (`pairKenBurns`) each get the automatic motion for
  the slide index, aimed at their own focus, but with no horizontal pan — `from.centerX` equals
  `to.centerX` — so the two stay in step; the zoom still alternates by index, the same direction
  for both halves.
- **Caption**: a picture's caption (`StoredPicture.caption`) becomes its slide's `caption`; a
  picture without one gets none. There is no automatic caption.
- **Transitions** (`pictureTransition`): the automatic effect is the slideshow's default
  (`StoredSlideshow.transition`, absent: the crossfade; `automaticTransition`, ADR-0010). Only
  the default `"alternate"` cycles through `TRANSITION_EFFECTS` in order by position
  (`autoTransitionEffect`, so none repeats back to back); a default `"cut"` composes no
  transition. A picture's own transition (`StoredPicture.transition`, ADR-0008) replaces it wherever
  the picture sits; `"cut"` composes a slide without `transitionToNext`. The last slide has none
  (ADR-0002), even with an own one stored. A transition's duration, own effect or automatic, is
  30% of its slide's duration, capped at 1000 ms (`transitionDurationMs`). A slide that ends on a
  beat hands over with the most whole beats, counted back along the beats found, that fit that
  duration, so the transition starts on a beat too; when one beat is longer, the usual duration
  stays (`beatTransitionDurationMs`).

- **Music** (`resolvePlaylist`, ADR-0009, ADR-0023): the songs (`StoredSlideshow.songs`) play
  in order, each from its excerpt's start. With `betweenSongs` absent each crossfades into the
  next: the next song starts where the previous one's fade-out starts, so the two overlap by
  that fade-out as played, and an automatic fade on either side of a join is `CROSSFADE_MS`
  (3 s). An overlap never exceeds the next song's excerpt nor reaches back past the end of the
  song before, so at most two sound at once. With `"sequence"` each song starts at the previous
  one's end. An own fade (`StoredMusic.fadeInMs`, `fadeOutMs`, 0 being off) is always kept, so an
  own fade-out of off makes a hard cut. Every other automatic fade follows ADR-0009: short (2 s)
  where the music is cut and off where a track starts or ends by itself — the first song's
  fade-in, the last song's fade-out, and both of every song one after another. The playlist is
  heard until its end or the slideshow's, whichever comes first: a longer slideshow plays its
  last pictures in silence; a shorter one leaves out the songs it never reaches and ends the
  ones heard at its end there, with their own fade-out or an automatic short one — the usual
  case when the pictures last their own seconds. Fades that together outlast what is heard of a
  song are scaled down in proportion. Changing the pictures on the beat moves no music: the
  excerpts and their fades stay as they are.

## Title and closing cards

The stored title and closing slides become cards, ground slides and merged first or last
slides with fixed durations: [player/TITLE_CARD_COMPOSITION.md](player/TITLE_CARD_COMPOSITION.md).

## Entry points

- `buildStoredSlideshow` applies the order and title to a fresh import.
- `composeSlideshow` turns a stored slideshow into the player's JSON, resolving picture and
  music ids to URLs through an injected `SlideshowSources`; the pictures' focus comes in as a
  map by picture id (`LibraryStore.pictureFocus`), the songs' beats as a map by music id (`SongBeats`, from
  `LibraryStore.musicBeats` per song; a song not listened to yet is absent), and the songs'
  loudness (`SongLoudness`, from `LibraryStore.musicLoudness`; absent until measured, `gain` 1
  meanwhile, ADR-0040) — all three read when the player or an export starts — play never waits
  on the search for the rest.
- `slideDurationsMs` with `filledMusicMs` and `playlistBeatsMs` gives the editors the same timing: the music
  editor's lane and the picture editor's duration and transition (`beatTransitionDurationMs`)
  follow the beats as the background pass finds them.
- `pictureDurationsMs` wraps `slideUnits` and `slideDurationsMs` to give one duration per
  picture, broadcasting a pair's shared duration to both halves, for UI that shows a picture's
  own timing (the picture editor, the "add pictures" note).
- `slideshowDurationMs` sums a stored slideshow's slide durations, own ones included, for a
  "12 pictures · 1:00" summary; without the beats, so with pictures lasting their seconds it can
  differ from the played length by part of a beat.

See `dev-docs/adr/0002-transitions-inside-slide-durations.md` for why a transition runs inside
its slide's duration, and `dev-docs/PLAYER.md` for the JSON contract these functions produce.
