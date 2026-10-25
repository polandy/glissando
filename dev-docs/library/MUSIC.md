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
settings to another place), `setBetweenSongs` (`StoredSlideshow.betweenSongs` `"sequence"`
plays the songs one after another, `checkBetweenSongs`; `undefined` deletes the field, so they
crossfade) and `setRepeatMusic` (`StoredSlideshow.repeatMusic` `true` repeats the playlist from
its first song for as long as the slideshow lasts instead of the pictures fitting a shorter one;
`undefined` deletes the field, so it plays once, ADR-0047). A removed song's media goes with the
clean-up of unreferenced media.

## Loudness levelling and song volume

ADR-0040. Every song plays levelled: brought to `MUSIC_TARGET_LOUDNESS_LUFS` = −14 LUFS, so a quiet and a
loud song sound equally loud without any setting. A song's own volume moves it from there.

- **Measured once per file, in blocks.** `LoudnessPass` (`dev-docs/library/LOUDNESS_LISTENING.md`)
  measures integrated loudness per ITU-R BS.1770: K-weighted, in 400 ms gating blocks with 75 %
  overlap, plus each block's sample peak. The blocks are stored per media id beside the beats
  (derived data: never exported, measured again where missing). A 5-minute song is about 3000
  pairs of numbers.
- **The excerpt is levelled, not the file.** The loudness of what plays — the gated integral
  over the blocks inside `trim` — follows from the stored blocks without decoding again, so a
  new trim re-levels at once. `levelDb = target − excerptLoudness`.
- **Own volume.** `StoredMusic.volumeDb`: whole dB, −12 to +6; absent, levelled (0). Set by
  `setMusicVolume` (deleting the field for `undefined` or 0), validated by `checkMusicVolumeDb`.
- **Never distorts.** `gainDb = min(levelDb + volumeDb, −1 dBFS − excerptPeak)`. When the cap
  bites, the editor says so ("as loud as it gets without distortion").
- **Not measured yet** (just added, still in the pass): played unlevelled, own volume still
  applies; the editor shows "Measuring…". Once measured it applies from the next play.
- **One number for player and export.** The composer resolves `gainDb` into the slideshow
  JSON's `MusicTrack.gain` (linear). The player sets each element's gain to
  `gain × fade/crossfade envelope × video duck × remote volume`; mute stays the master gain.
  The video export's per-track gain node carries `gain ×` the same envelope ramps, the duck stays
  on the music bus. The HTML export plays through the player. Clip sound is not levelled; it
  keeps its own clip volume.
