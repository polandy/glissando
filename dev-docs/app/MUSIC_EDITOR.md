# Music editor

- **Music editor** (`music-editor/`, route `routes/MusicEditorRoute.svelte`; mockup:
  https://polandy.github.io/glissando-assets/mockups/music-trim/ and
  https://polandy.github.io/glissando-assets/mockups/beat-sync/ and
  https://polandy.github.io/glissando-assets/mockups/beat-durations/ and
  https://polandy.github.io/glissando-assets/mockups/playlist/, ADR-0009, ADR-0021, ADR-0022,
  ADR-0023): the playlist's songs, how long the pictures last and how one song hands over to the
  next; for the selected song its excerpt, whether the pictures change on its beats, and its
  fades. Bar: back and "Library / title / Music". Desktop: a main column and a 340 px panel on
  the right; up to 720 px stacked. Every change is stored at once; only a removed song has an
  undo toast ("Song removed"): "Whole track" and "Back to automatic" restore the rest in one
  tap.
  - **No music yet**: for a slideshow without songs (the panel's "Add music" opens it), a dashed
    card with a music disc, "No music yet", "Add one song or several; they play one after
    another and the pictures change on their beat." and the accent button "Add a song".
  - **Songs** (`SongList.svelte`): a row per song in play order — a grip, its number on the
    song's colour (`--gl-song-1` … `-6` in turn), the file name over "3:24" (trimmed "3:24 ·
    trimmed to 2:18"), "from 0:57" where it starts in the slideshow, and × (removes it, with
    the undo toast). A song starting after the slideshow's end is dimmed and reads "Not
    reached"; it stays and plays once the slideshow grows. Tapping a row selects the song; the
    first is selected on opening and when the selected one goes. The grip
    (`song-drag.ts`, ADR-0019's pattern) drags the song onto another row, which a dashed accent
    outline marks, or moves it up and down with the arrow keys while focused. Then "+ Add a
    song", a dashed button picking one file or several (`song-intake.ts`): each is read as in
    the import's music step (converted to FLAC where a target browser cannot play it,
    ADR-0020), its audio stored where the slideshow lives (on this device claimed until the
    playlist with it is stored; on the server uploaded), and appended in the order picked.
    Until then it is a dashed row with its name ("Converting to FLAC · 42 %" while converting);
    a file that cannot be used stays as a coral row "This file can't be used" until its ×.
  - **Playlist lane** (`PlaylistLane.svelte`): "Playlist, 3 songs · 2:54" with "Crossfades
    hatched" (or "One after another"), then the songs as numbered blocks in their colours from
    where each starts, a crossfade hatched where two overlap (the next song's number after the
    hatching), songs not reached faded, and a
    coral mark "Slideshow ends" where the slideshow ends first. Below on the same scale
    "Slideshow, 24 pictures · 2:00" with "Music fades out with the last picture", "Last
    pictures in silence" or "Ends with the music": a mint bar with a tick per picture change,
    lemon hatching where pictures play in silence; and a scale "0:00 … 2:54".
  - **Selected song** (`SelectedSong.svelte`): "Song 2 · name" and its length, then the
    waveform of the whole track (decoded once with Web Audio into 1000 peaks, drawn as a bar
    every 5 px), dimmed outside the excerpt; an accent line over it is the volume, ramping
    through the fades, and the bars inside a fade shrink with it. Two accent handles "Start"
    and "End" carry their time ("0:12,0"); dragging one, or grabbing the waveform anywhere (the
    nearer handle follows, keeping the grab's offset), moves it in tenths of a second, live,
    and stores it on release; as sliders the arrow keys move a tenth, with Shift a second. The
    excerpt stays at least 5 s; a track shorter than that stays whole. While the pictures change
    on the beat, a tick per beat along the waveform's foot, every fourth taller. A time ruler
    below. Then the lane "Slideshow, 24 pictures" with
    its length: a mint bar from the excerpt's start for as long as the slideshow plays this song
    (none for a song not reached), a tick
    per picture change (on the beat, a change that falls between beats — e.g. the one after a picture with an
    own duration — is a wider coral tick), lemon hatching past the last song's excerpt end when the pictures play on
    in silence; when the slideshow ends earlier, the waveform is hatched from there to the
    excerpt's end. "Listen to the start" (the excerpt's first 8 s with the fade-in, "from
    0:12,0") and "Listen to the end" (the last 8 s before the music stops being heard, with the
    fade-out, "until 2:30,0") toggle to pause; while it plays, one line runs from the top of the
    waveform down through both lanes, a time chip below the slideshow lane naming the position
    ("0:14,0"), and the picture it is over lit a stronger mint; grabbing a handle stops it. A
    hint names the handles' keys and the line.
  - **Excerpt**: the state "Whole track" or "Trimmed" (accent-tinted), Start and End as
    "0:12,0" with − and + for half seconds, then "Whole track" (resets) or, untrimmed, "The
    slideshow uses the whole track, 3:24."
  - **Picture length** (`components/PictureLengthSection.svelte`, also in the new slideshow's
    music step): a clock icon, "About 5 s each" and "Fill the music" as a radiogroup (arrows move
    the choice), stored at once; with the first, the seconds stepper (− and + for half seconds, 2
    to 15 s) below it.
  - **Fade in** and **Fade out**: a ramp icon, the state "Automatic" or "Own", three steps Off,
    Short (2 s), Long (5 s) as a radiogroup (arrows move the choice); the automatic choice is
    outlined dashed and explained: "Automatic: short, as the excerpt starts mid-track." / "off,
    as the track plays from its start" / "short, as the slideshow ends at 2:00" / "short, as the
    excerpt stops before the track ends" / "off, as the track ends by itself"; in a crossfade 3 s,
    as "the crossfade from the previous song" / "the crossfade into the next song". Any step
    makes it own; "Back to automatic" follows.
  - **Picture changes** (`PictureChangesSection.svelte`, view `picture-changes-view.ts`; the
    beats come from the background pass, `src/app/beats/playlist-beats.ts`, per song): a transition icon and,
    once a beat is found, the tempo "124 BPM" as its state. Until the pass has a result, a
    breathing accent dot and "Listening for the beat… Until then the pictures share the music
    evenly." (pictures lasting their seconds: "… Until then each picture stays exactly 5 s.").
    With a beat, "On the beat" (the default) and "Evenly" as a radiogroup (arrows move
    the choice), stored with the music at once; on the beat "Every automatic change lands on a
    beat of the music; a transition lasts whole beats.", with own durations followed by
    "Pictures 5 and 12 keep their own duration, so the change after each can fall between
    beats."; evenly "The pictures share the music evenly, regardless of its beat." (or "Each
    picture stays exactly 5 s, regardless of the beat.").
    Music without a clear beat: "No steady beat found in this music. The pictures share it
    evenly." (or "… Each picture stays exactly 5 s."), no choice. Only music this device cannot
    decode reads "Glissando could not listen to this music's beat. The pictures share it
    evenly." (or "… Each picture stays exactly 5 s."); a detection that failed otherwise
    reads as still listening, as the next pass tries again. Opening the editor, and adding a song,
    listens for each song next (`BeatPass.listenFor`), so music kept since the app opened and a
    server slideshow's music are listened to as well.
  - **Picture times**: "23 pictures without their own duration share the excerpt: 5.7 s each.
    The slideshow ends with the music." (on the beat, where the shares vary: "about 5.7 s each"), or on lemon "The slideshow runs 0:14 longer than the
    music." with why, or with every picture timed "… The slideshow ends after 2:00; the music
    fades out there." With pictures lasting their seconds: "Each picture without its own
    duration stays about 5 s, each change on the nearest beat. The slideshow lasts 2:00; the
    music fades out there." (off the beat "stays 5 s."), or on lemon the slideshow running
    longer with "Each picture without its own duration stays 5 s; after the fade-out the last
    pictures play in silence. Shorter pictures, longer music or “Fill the music” fix that."
  - **Between songs** (`BetweenSongsSection.svelte`, only with two songs or more): "Crossfade"
    (the default; "The next song starts while the previous one fades out.") and "One after
    another" ("The next song starts once the previous one has faded out.") as a radiogroup.
    The panel (`MusicEditorPanel.svelte`) is in two groups: "Slideshow" with Picture length and
    Between songs, then "Song 2" — for a song not reached first the lemon note "The slideshow
    ends before this song starts; it plays once the slideshow grows." — with Excerpt, Picture
    changes, Picture times, Fade in, Fade out. The rules: `dev-docs/COMPOSITION.md`.
