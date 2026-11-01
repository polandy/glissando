# Music editor: the selected song

The panel for the song selected in the [music editor](../MUSIC_EDITOR.md).

- **Selected song** (`SelectedSong.svelte`): "Song 2 · name" and its length, then the
  waveform of the whole track (decoded once with Web Audio into 1000 peaks, drawn as a bar
  every 5 px), dimmed outside the excerpt; with the Details switch on (MUSIC_EDITOR.md), an accent line over
  it is the volume, ramping through the fades, and the bars inside a fade shrink with it
  (`wave-view.ts`); off, neither. Two accent handles "Start"
  and "End" carry their time ("0:12,0"); dragging one, or grabbing the waveform anywhere (the
  nearer handle follows, keeping the grab's offset), moves it in tenths of a second, live,
  and stores it on release; as sliders the arrow keys move a tenth, with Shift a second. The
  excerpt stays at least 5 s; a track shorter than that stays whole. While the pictures change
  on the beat and the Details are on, a tick per beat along the waveform's foot, every fourth
  taller. A time ruler below. With the Details on, the lane "Slideshow, 24 pictures" with
  its length: a mint bar from the excerpt's start for as long as the slideshow plays this song
  (none for a song not reached), a tick
  per picture change (on the beat, a change that falls between beats — an own duration with no
  automatic picture left after it to absorb the shift — is a wider coral tick), lemon hatching past the last song's excerpt end when the pictures play on
  in silence; when the slideshow ends earlier, the waveform is hatched from there to the
  excerpt's end. "Listen to the start" (the excerpt's first 8 s with the fade-in, "from
  0:12,0") and "Listen to the end" (the last 8 s before the music stops being heard, with the
  fade-out, "until 2:30,0") toggle to pause; while it plays, one line runs from the top of the
  waveform down through both lanes (the waveform alone without the Details), a time chip below
  naming the position
  ("0:14,0"), and the picture it is over lit a stronger mint; grabbing a handle stops it. A
  ⓘ beside the song's length names the handles' keys and the line.
- **Excerpt**: the state "Whole track" or "Trimmed" (accent-tinted), Start and End as
  "0:12,0" with − and + for half seconds, then "Whole track" (resets) or, untrimmed, "The
  slideshow uses the whole track, 3:24."
- **Volume** (`VolumeSection.svelte`, ADR-0040, `dev-docs/library/MUSIC.md` "Loudness
  levelling and song volume"): a slider around the levelled point (0 dB), hatched past the peak
  ceiling; the readout "Levelled" or the own dB that plays (held at the ceiling), with why (same
  loudness, louder, quieter, or capped short to avoid distortion); "Back to levelled" once own.
  "Listen" plays the excerpt's loudest 8 s at the resolved gain (toggle to stop); "Original file"
  swaps it for the file's own gain in place; while listening, a hint invites tapping another song
  to compare, which then plays. The song's audio opens only at its first listen (`DeferredMusic`): showing a song loads
  none, as WebKit can hang the page when a routed audio element starts loading while it is busy.
- **Picture length** (`components/PictureLengthSection.svelte`): a clock icon, "About 5 s each" and "Fill the music" as a radiogroup (arrows move
  the choice), stored at once; with the first, the seconds stepper (− and + for half seconds, 2
  to 15 s) below it. Once own seconds or a mood (`MoodPictureTimesSection.svelte`) would outlast
  a shorter music and the pictures shrink to end with it instead (ADR-0047), the section's one line
  (below) names the shrunk share. Its ⓘ explains both choices.
- **The Picture length line** (`PictureLengthNotice.svelte`, the pure `picture-length-notice.ts`;
  the mood's section gets the same line): exactly one outcome, ADR-0047 — "Shortened to 3.3 s each,
  to end with the music"; "Slideshow 2:00 · ends with the music"; "Slideshow 2:00 · the music fades
  out at the end"; "Slideshow 2:00 · the music repeats and fades out at the end"; or, while the
  pictures outlast a music that does not repeat, "The music ends 0:12 before the pictures." plus
  one text link "Repeat the music" (sets `repeatMusic`; adding a song is the song list's row only).
  Neutral muted text; the lemon warning tint only when the gap is more than a third of the
  slideshow (exactly a third stays neutral).
- **Fade in** and **Fade out**: a ramp icon, the state "Automatic" or "Own", three steps Off,
  Short (2 s), Long (5 s) as a radiogroup (arrows move the choice); the state reads "Automatic · short"
  (the automatic choice, also outlined dashed) or "Own". The reason sits in the ⓘ: "Automatic:
  short, as the excerpt starts mid-track." / "off, as the track plays from its start" / "long, as
  the slideshow ends at 2:00" / "long, as the excerpt stops before the track ends" / "off, as the
  track ends by itself"; in a crossfade 3 s, as "the crossfade from the previous song" / "the
  crossfade into the next song". Any step makes it own; "Back to automatic" follows.
- **Picture changes** (`PictureChangesSection.svelte`, view `picture-changes-view.ts`; the
  beats come from the background pass, `src/app/beats/playlist-beats.ts`, per song): a transition icon and,
  once a beat is found, the tempo "124 BPM" as its state. Until the pass has a result, a
  breathing accent dot and "Listening for the beat… Until then the pictures share the music
  evenly." (pictures lasting their seconds: "… Until then each picture stays exactly 5 s.").
  With a beat, "On the beat" (the default) and "Evenly" as a radiogroup (arrows move
  the choice), stored with the music at once; the ⓘ explains "Every automatic
  change lands on a beat of the music; a transition lasts whole beats." — every own duration
  moves there too, about its set length, except one with no automatic picture left after it to
  absorb the shift, named "Pictures 5 and 12 keep their own duration exactly: …" — and, for
  evenly, "The pictures share the music evenly, regardless of its beat." (or "Each picture stays
  exactly 5 s, regardless of the beat."). No such paragraph shows on the page.
  Music without a clear beat: "No steady beat found in this music. The pictures share it
  evenly." (or "… Each picture stays exactly 5 s."), no choice. Only music this device cannot
  decode reads "Glissando could not listen to this music's beat. The pictures share it
  evenly." (or "… Each picture stays exactly 5 s."); a detection that failed otherwise
  reads as still listening, as the next pass tries again. Opening the editor, and adding a song,
  listens for each song next (`BeatPass.listenFor`), so music kept since the app opened and a
  server slideshow's music are listened to as well.
- **Between songs** (`BetweenSongsSection.svelte`, Details, only with two songs or more): "Crossfade"
  (the default) and "One after another" as a radiogroup; the ⓘ says "The next song starts while
  the previous one fades out." / "… once the previous one has faded out.".
- **Repeat the music** (`RepeatMusicSection.svelte`, ADR-0047): a row like "Follow the music's
  energy" (`EnergyPacingRow.svelte`) — a label on the left, its ⓘ, a switch on the right,
  stored at once, always enabled; the ⓘ says the songs play again from the first one when they
  end before the pictures.
  The panel (`MusicEditorPanel.svelte`) is in two groups: "Slideshow" with Picture length,
  Between songs and Repeat the music, then "Song 2" — for a song not reached first the lemon
  note "The slideshow ends before this song starts; it plays once the slideshow grows." — with
  Excerpt, Volume, Picture changes, Fade in, Fade out (the "Song N" group is Details only). The rules:
  `dev-docs/COMPOSITION.md`.
