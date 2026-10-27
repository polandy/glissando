# Mood

One mood per slideshow — Calm, Lively or Custom — that sets the default transition, the picture
times and the Ken Burns strength from the music's tempo (ADR-0045). A new slideshow starts on
Calm unless the import set the pace (ADR-0049, `buildStoredSlideshow`). Mockup, option A:
`https://polandy.github.io/glissando-assets/mockups/slideshow-moods/`.
The sheet also holds the switch "Follow the music's energy" ([ENERGY_PACING](ENERGY_PACING.md)).

## Moods

`MOOD_PROFILES` in `src/compose/mood-settings.ts`; Custom is no entry (the field is absent).

| Mood   | Target seconds | Beat step  | Default transition | Transition share, cap | Ken Burns strength |
| ------ | -------------- | ---------- | ------------------ | --------------------- | ------------------ |
| Calm   | 7              | 4 (phrase) | crossfade          | 45 %, 1600 ms         | 0.5 (Gentle)       |
| Lively | 3              | 2          | alternate          | 15 %, 500 ms          | 1.4 (Strong)       |

- **Picture seconds** (`moodSettings(mood, beatsPerMinute)`): with a tempo, `step = beatStep ×
60 / bpm` seconds and `seconds = max(1, round(target / step)) × step`, clamped to
  `MIN_SECONDS_PER_PICTURE`…`MAX_SECONDS_PER_PICTURE`; without one, the target seconds. Calm at
  76 BPM: 2 phrases, 6.3 s; at 128 BPM: 4 phrases, 7.5 s. Lively at 128 BPM: 3 steps, 2.8 s.
- **Tempo** (`moodTempo`): `beatsPerMinute` of the first song in play order whose beats are
  `kind: "beats"` and whose `pictureChanges` is not `"even"`; else none.
- **Ken Burns strength** `s` scales the automatic motion (`autoKenBurns`): the largest zoom is
  `1 + (MAX_ZOOM − 1) · s`, still lowered to fit the subject group (ADR-0029) and never below
  `SMALLEST_ZOOM_TRAVEL`; the pan swing is `PAN_OFFSET · s`; the scenery sweep's zooms are
  `1 + (z − 1) · s`. Custom is `s = 1`, today's motion. A picture-frame round is not a stored
  slideshow and keeps `s = 1`.
- **Transition length** under a mood: `share × slide duration`, capped, instead of 30 % and
  1000 ms; the beat-aligned handover (`beatTransitionDurationMs`) then works on that length.

## Composing

`composeSlideshow` with `stored.mood` set: `secondsPerPicture` is the mood's seconds
(`stored.pictureLength` ignored), the default transition is the mood's, and the transition
length and Ken Burns strength follow the table. A shorter music still shrinks the mood's seconds
to fit it, like "Fill the music" and own seconds (`picturesFillMs`, ADR-0047) — the mood keeps
its pace otherwise. Own duration, own transition and own motion of a picture win as always
(ADR-0008); beats snap as in `dev-docs/COMPOSITION.md`.

## Editing

- **Choose**: `setSlideshowMood(slideshow, mood | undefined)`; Custom deletes the field. The
  single settings are not touched, so Custom brings them back as they were.
- **Leave by a single change** (`leaveMood`): setting the default transition, the picture length
  or the seconds per picture while a mood is set first writes `transition` = the mood's,
  `pictureLength` = `"seconds"`, `secondsPerPicture` = its target seconds, deletes `mood`, then
  applies the change. The toast "Mood is now Custom" offers "Undo", which restores the slideshow
  as it was before the change.
- Own values of a picture never leave the mood.

## UI

- **Tile**: the info panel's "Mood" tile sits between "Music" and "Look" and opens the sheet. It
  shows the mood's name and a summary of picture times and motion ([SCREENS](../SCREENS.md)).
- **What it sets elsewhere**: under a mood, the "Transitions" row under "Fine settings" shows the
  mood's transition with "by mood" underneath. The Transitions sheet checks the mood's transition and says "Set by the
  mood Calm. Choosing another switches the mood to Custom." The music sheet shows, instead of
  the picture-length choice, "Picture times are set by the mood Calm — ~6.3 s, 8 beats" and a
  "Set them yourself" button that leaves the mood.
- **Sheet** (`slideshow/MoodSheet.svelte`): modal like the Look sheet, title "Mood" and a state
  pill with the mood's name, accent-tinted for any mood but Custom.
  - **Preview** (`MoodPreview.svelte`): the real player (`createPlayer`) on the slideshow's
    first four slide units composed with the shown mood, looping, silent until its "Sound"
    toggle is on; no badge over it, the tempo shows only in "What it sets" below. Plays at once
    and re-paces once the background beat pass finds a song's beats, or once a mood is chosen.
    Left out without pictures.
  - **Tiles**: a radiogroup — Calm "Slow, soft", Lively "Quick, on the beat", Custom "Your
    settings"; three columns. A tap stores at once; arrow keys move it.
  - **What it sets**: Picture times, Transitions ("Crossfade, long" / "Mixed, short" /
    "standard") and Ken Burns, worked out for this slideshow's tempo.
  - **Hint**: under a mood "Picture times follow the song's beats and phrases. Pictures with
    their own duration, transition or motion keep them."; for Custom "Your own picture times,
    transitions and Ken Burns, as set on the slideshow."
  - **Footer**: "Back to Custom" (disabled-looking under Custom; toast "Mood back to Custom"
    with "Undo") and "Done". Done, Esc or a tap on the scrim closes it; focus starts on the
    checked tile and goes back to the row.

## Stored

`StoredSlideshow.mood` (`"calm" | "lively"`, `checkSlideshowMood`), validated at the edit, the
`.glissando` reader (from format 19, `MOOD_FROM_VERSION`) and the server document reader (from
version 5). The composed player JSON carries no mood.
