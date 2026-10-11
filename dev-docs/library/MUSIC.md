# Music

A slideshow plays a playlist (ADR-0023): `StoredSlideshow.songs`, in play order, empty without
music. Each song is one file the browser plays natively. Its duration is read from the file's metadata; a file the
browser cannot load, or one without a finite duration (a live stream), is rejected as
unreadable.

The music editor sets an excerpt and fades on a song (ADR-0009); the file itself is never
changed. The music editor edits the playlist's first song. `StoredMusic.trim` (`{ startMs, endMs }`, whole ms, `0 ≤ startMs`,
`endMs ≤ durationMs`, at least `MIN_MUSIC_EXCERPT_MS` = 5000 long) is the part that plays;
absent, the whole track. `fadeInMs` and `fadeOutMs` are own fades in whole ms, 0 to 10000 in
steps of 500, 0 being off (the editor offers off, 2000 and 5000); absent, automatic.
`pictureChanges` `"even"` has the pictures share the music evenly; absent, they change on the
beat when one was found (ADR-0021). `StoredSlideshow.pictureLength` `"seconds"` has the
pictures without an own duration last `secondsPerPicture` each with music too; absent, they
fill the music (ADR-0022). A new slideshow is created with `"seconds"` unless the user picks
"Fill the music". `setPictureLength` (deleting the field for `undefined`, validated by
`checkPictureLength`) and `setSecondsPerPicture` (half seconds, 2 to 15) are in
`src/library/slideshow-edits-timing.ts`.
`setMusicTrim` deletes the field for `undefined` or the whole track, `setMusicFadeIn`,
`setMusicFadeOut` and `setMusicPictureChanges` for `undefined`; each addresses its song by id
and throws for one the slideshow does not play (`src/library/slideshow-edits-music.ts`); all
validate (`checkMusicTrim`, `checkMusicFadeMs`, `checkPictureChanges`). The playlist's own
edits are in `src/library/slideshow-edits-songs.ts`: `addSongs` appends (refusing a song it
already has, validating each song's own fields), `removeSong`, `moveSong` (a song with its own
settings to another place) and `setBetweenSongs` (`StoredSlideshow.betweenSongs` `"sequence"`
plays the songs one after another, `checkBetweenSongs`; `undefined` deletes the field, so they
crossfade). A removed song's media goes with the clean-up of unreferenced media.
