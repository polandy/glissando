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
  ADR-0008) is kept exactly. Without music, and with music when `StoredSlideshow.pictureLength`
  is `"seconds"` (ADR-0022), every other slide gets `secondsPerPicture`. When the pictures fill
  the music (`pictureLength` absent; `filledMusicMs`), the pictures without an own duration share what the own durations leave of the
  playlist (`playlistMs`: the songs' excerpts — each the trim, or the whole track, ADR-0009 —
  summed, less the crossfades' overlaps; ADR-0023) evenly (the remainder
  milliseconds go to the first of them, so the sum matches the playlist exactly) — unless that share would fall below `MIN_SECONDS_PER_PICTURE` (or nothing is left),
  in which case each of them gets the minimum and the slideshow outlasts the music. When every
  picture has an own duration, the music plays no part in the timing. **On the beat**
  (ADR-0021): with the playlist's beats (`playlistBeatsMs`: each song's beats from `src/beats/`
  strictly inside its excerpt, placed at the song's start in the playlist; inside a crossfade's
  overlap only the incoming song's; a song with `pictureChanges` `"even"`, without a clear beat
  or not listened to yet gives none)
  each boundary that ends an automatic slide then moves to the nearest beat that leaves that
  slide and the next automatic one at least `MIN_SECONDS_PER_PICTURE` (`snapToBeats`), else
  stays. Pictures with an own duration between the two move along, so the first of them starts
  on the beat and each keeps its duration exactly; the boundary after them is not snapped, and
  the next automatic slide takes up the difference. The playlist's end, and a boundary followed by
  own durations only, never move, so the total is unchanged. When the pictures last their
  seconds, the boundaries snap the same way and the last automatic slide's end moves too, to the
  nearest beat within its slack above the minimum, with the own durations after it following:
  the slideshow ends on a beat, about as long as its pictures. When no song gives a beat, the even share stands.
- **Ken Burns**: zoom alternates in/out by slide index between `MIN_KEN_BURNS_ZOOM` and 1.2; a
  gentle horizontal pan alternates direction with it. The motion swings around the picture's
  focus — the centre of the subject box the on-device detection found (`PictureFocus`,
  ADR-0012), each pan end kept inside the picture. Without a subject (nothing found, or not
  looked at yet) a portrait picture's centre is raised toward where faces usually sit and a
  landscape picture's stays in the middle. Easing is always `linear`. A picture with an own motion (set in the picture editor, stored as
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

## Entry points

- `buildStoredSlideshow` applies the order and title to a fresh import.
- `composeSlideshow` turns a stored slideshow into the player's JSON, resolving picture and
  music ids to URLs through an injected `SlideshowSources`; the pictures' focus comes in as a
  map by picture id (`LibraryStore.pictureFocus`), the songs' beats as a map by music id (`SongBeats`, from
  `LibraryStore.musicBeats` per song; a song not listened to yet is absent), both read when the
  player or an export starts — play never waits on the search for the rest.
- `slideDurationsMs` with `filledMusicMs` and `playlistBeatsMs` gives the editors the same timing: the music
  editor's lane and the picture editor's duration and transition (`beatTransitionDurationMs`)
  follow the beats as the background pass finds them.
- `slideshowDurationMs` sums a stored slideshow's slide durations, own ones included, for a
  "12 pictures · 1:00" summary; without the beats, so with pictures lasting their seconds it can
  differ from the played length by part of a beat.

See `dev-docs/adr/0002-transitions-inside-slide-durations.md` for why a transition runs inside
its slide's duration, and `dev-docs/PLAYER.md` for the JSON contract these functions produce.
