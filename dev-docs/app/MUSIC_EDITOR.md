# Music editor

- **Music editor** (`music-editor/`, route `routes/MusicEditorRoute.svelte`; mockup:
  https://polandy.github.io/glissando-assets/mockups/music-trim/ and
  https://polandy.github.io/glissando-assets/mockups/beat-sync/ and
  https://polandy.github.io/glissando-assets/mockups/beat-durations/ and
  https://polandy.github.io/glissando-assets/mockups/playlist/ and
  https://polandy.github.io/glissando-assets/mockups/music-fits/, ADR-0009, ADR-0021, ADR-0022,
  ADR-0023, ADR-0047): the playlist's songs, how long the pictures last and how one song hands
  over to the next; for the selected song its excerpt, whether the pictures change on its beats,
  and its fades. Bar: back and "Library / title / Music". Desktop: a main column and a 340 px
  panel on the right; up to 720 px stacked. Every change is stored at once; only a removed song
  has an undo toast ("Song removed"): "Whole track" and "Back to automatic" restore the rest in
  one tap.
  - **No music yet**: for a slideshow without songs (the panel's "Add music" opens it), a dashed
    card with a music disc, "No music yet", "Add one song or several; they play one after
    another and the pictures change on their beat." and the accent button "Add a song". Under
    it, in the main column, the slideshow's **Picture length** — the only place a slideshow
    without music sets it: under a mood, "Picture times are set by the mood Calm — ~7 s"
    (`MoodPictureTimesSection.svelte`, no beats) and "Set them yourself"; under Custom, "About
    5 s each" and the stepper alone (`PictureLengthSection.svelte` `withoutMusic`), as there is
    no music to fill. Mockup:
    https://polandy.github.io/glissando-assets/mockups/music-editor-no-music-pace/
  - **Songs** (`SongList.svelte`): a row per stored song, once each even while the music repeats
    (ADR-0047; the playlist lane below shows the repeats) — a grip, its number on the
    song's colour (`--gl-song-1` … `-6` in turn), the file name over "3:24" (trimmed "3:24 ·
    trimmed to 2:18"), "from 0:57" where it starts in the slideshow, and × (removes it, with
    the undo toast). A badge by the length (`VolumeBadge.svelte`) shows the own dB once set, or
    pulses "Measuring…" until the loudness is known; a levelled song shows none. A song starting
    after the slideshow's end is dimmed and reads "Not
    reached"; it stays and plays once the slideshow grows. Tapping a row selects the song; the
    first is selected on opening and when the selected one goes. The grip
    (`song-drag.ts`, ADR-0019's pattern) drags the song onto another row, which a dashed accent
    outline marks, or moves it up and down with the arrow keys while focused. Then "+ Add a song", a dashed
    button; with sample music it opens a sheet with the import's two blocks, the music block unfolded (library/SAMPLE_MUSIC.md).
    Picking one file or several (`song-intake.ts`): each is read as in
    the import's music step (converted to FLAC where a target browser cannot play it,
    ADR-0020), its audio stored where the slideshow lives (on this device claimed until the
    playlist with it is stored; on the server uploaded), and appended in the order picked.
    Until then it is a dashed row with its name ("Converting to FLAC · 42 %" while converting);
    a file that cannot be used stays as a coral row "This file can't be used" until its ×.
  - **Playlist lane** (`PlaylistLane.svelte`): "Playlist, 3 songs · 2:54" with "Crossfades
    hatched" (or "One after another"), then the songs as numbered blocks in their colours from
    where each starts, a crossfade hatched where two overlap (the next song's number after the
    hatching), songs not reached faded, and a coral mark "Slideshow ends" where the slideshow
    ends first. While the music repeats (ADR-0047) the lane shows "Repeats until the slideshow
    ends" instead, and each repeated block carries a trailing "↻" on its number; the crossfade
    hatching also covers a repeat's loop boundary, between the playlist's last block and its
    first repeated one. Below on the same scale "Slideshow, 24 pictures · 2:00" with "Music
    fades out with the last picture", "Music repeats · fades out with the last picture", or
    "Ends with the music" (the last also while the pictures are fitted to a shorter music; absent
    only while they instead outlast it, see below): a mint bar with a tick per picture change;
    and a scale "0:00 … 2:54".
    Under the lane, one of two notes (ADR-0047): once the automatic pictures shrink to end with
    the music, a mint note "Pictures about {n} s each, to end with the music."; once they instead
    outlast it and the music does not repeat, a lemon note with "The music ends {over} before the
    pictures" and two buttons, "Repeat the music" (sets `repeatMusic`) and "Add a song" (the same
    file picker as elsewhere in the lane).

| Section                                            | What it covers                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| [The selected song](music-editor/SELECTED_SONG.md) | Waveform, excerpt, volume, picture length, fades, beats, handover |
