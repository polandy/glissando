# UX backlog — Music editor

Back to [UX_BACKLOG.md](../UX_BACKLOG.md). Screen: `src/app/music-editor/MusicEditorScreen.svelte`,
route `music`; the "Details" switch is stored in `glissando.musicEditorDetails`.

### UX-10 Explainer paragraphs under every control (size M)

Problem — Nearly every control carries a two-line paragraph: "Every automatic change lands on a
beat of the music; a transition lasts whole beats.", "Automatic: off, as the track plays from
its start.", "Automatic: the crossfade into the next song.", "The next song starts while the
previous one fades out.", plus a boxed "Picture times" paragraph that restates the slideshow
length and the fade-out. On the phone the Essentials view is five screens long before Details.

Where — Music editor, phone and desktop side panel; strings `music.onTheBeatHint`,
`music.ownDurationsOffBeat`, `music.noteOutlastsWhy`, `music.reason-*`,
`music.repeatMusicOffHint` in `src/app/i18n/catalogue-en*.ts`.

Why — "A feature that needs a manual is redesigned, not documented." Inline paragraphs are the
manual. They also push the controls apart so the eye cannot compare them.

Proposal — Keep one short line of consequence per control where the state is not self-evident
("Slideshow 3:25, music fades out at the end"); move the mechanics into an ⓘ popover per
section, or drop them. Target: no section taller than its control plus one line.

Done when — Essentials on 390×844 fits in at most two screens with two songs; every remaining
helper string states an outcome, not a mechanism (reviewed in the PR's before/after table).

### UX-11 Essentials shows almost everything (size M)

Problem — With Details off the editor still shows the song list, the playlist lane, the
slideshow bar, the waveform with trim handles, Listen-to-start / Listen-to-end, Excerpt
Start/End steppers, Volume with slider and warning, Picture changes, Fade in, Fade out. Details
adds hatched crossfades and the volume line. The split does not match what a first-time user
needs: which songs, how long each picture stays, repeat or not.

Where — Music editor, Details switch in the header.

Why — Progressive disclosure: essentials are the three decisions above; trim, volume, fades
and beat alignment are refinements.

Proposal — Essentials: songs (add, remove, reorder), Picture length (mood / fill / set), Repeat
the music, and the one-line fit notice. Details: waveform with trim, Listen, Excerpt, Volume,
Between songs, Picture changes, Fades. Default Details to off for a new device.

Done when — The Essentials DOM contains only the listed sections (browser test); Details still
exposes every current control; user guide updated.

### UX-12 "Add a song" shown twice, and the fit warning competes with it (size S)

Problem — When the music ends before the pictures, a yellow notice says so and offers "Repeat
the music" and "Add a song", while the song list above already has an "Add a song" row. The
notice reads as an error although the app handles it (pictures shrink or the music fades).

Where — Music editor after adding a 40 s track to a 3:25 slideshow; import music step shows
the same pair.

Why — One call to action per need; a warning colour for a state the app resolves itself is
alarm without cause.

Proposal — One notice line in the Picture length section with the two choices as text links,
neutral colour unless the gap is large (e.g. more than a third of the slideshow). Remove the
duplicate button.

Done when — Only one "Add a song" control exists on the screen in that state; the notice uses
the warning colour only above the chosen threshold (unit test on the threshold).

### UX-13 Waveform is flat while decoding, with no text (size S)

Problem — While peaks are being computed the waveform shows flat bars, which looks like a silent
or broken file; the clip editor's waveform has the same gap.

Where — `WaveformBars.svelte:29` (peaks null), `ClipWaveform.svelte`.

Why — "Never a spinner without a label"; here there is not even a spinner.

Proposal — A labelled placeholder in the waveform area ("Reading the song…") and a shimmer in
reduced-motion-safe form, replaced by the bars when peaks arrive.

Done when — A browser test with delayed decoding asserts the label is visible before peaks and
gone after.
