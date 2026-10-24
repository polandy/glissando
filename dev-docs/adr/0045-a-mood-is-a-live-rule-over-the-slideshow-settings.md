# ADR-0045: A mood is a live rule over the slideshow settings, worked out from the tempo

**Status:** accepted

## Context

A slideshow can take a mood — Calm or Lively — instead of its single settings: the default
transition, the picture times and how strongly the automatic Ken Burns moves. "Custom", the
default, leaves the single settings as they are. A mood has to fit the music's tempo (ADR-0021),
so a slow and a fast song pace the same mood differently. Four questions need an answer: how a
mood relates to the single settings and to a picture's own values, which tempo it follows, what
it does to "fill the music" (ADR-0022), and where it is worked out.

## Decision

- **Stored as a rule, resolved when composing.** `StoredSlideshow.mood` holds the mood's id,
  absent for Custom, like the look (ADR-0044). `composeSlideshow` works out the picture length,
  default transition, transition share and cap and the Ken Burns strength from the mood and the
  tempo (`moodSettings`, pure; table in `dev-docs/app/slideshow-editing/MOOD.md`). Changing the
  songs or trimming them re-paces the mood with no edit.
- **The single settings stay stored untouched under a mood.** Choosing Custom brings them back
  as they were. Changing one of them while a mood is on — the default transition, the picture
  length or the seconds per picture — switches to Custom first and writes the mood's values into
  them (`leaveMood`: its transition, its target seconds, own seconds), then applies the change,
  with the editor's undo. The Ken Burns strength and the transition share have no single setting
  and go back to the standard ones.
- **A picture's own values always win** (ADR-0008): own duration, own transition and own
  motion are kept under every mood; an own duration still snaps to the beat within its slack.
- **The tempo is the first song's that has beats** (`beatsPerMinute` of the first song in play
  order with a clear beat and `pictureChanges` not `"even"`). The picture length is the whole
  number of the mood's beat steps — a phrase of 4 for Calm, 2 for Lively — closest to its target
  seconds, kept within the picture length bounds; `snapToBeats` then places every boundary on the
  beats of whichever song plays. Without a tempo the target seconds are used as they are.
- **A mood paces; it never fills the music.** Under a mood the pictures last the mood's length
  and the stored `pictureLength` is ignored; when the pictures end before the music, the music
  fades out at the slideshow's end as with own seconds today.
- **No player change.** Transition durations and Ken Burns framings are already resolved in the
  composed JSON, so the player format stays as it is. The `.glissando` format goes to version 19
  and the server document to version 5, both with an optional `mood`; no migration.

## Options weighed

- _A one-time preset that writes the single settings_ — rejected: it could not follow the
  tempo once the music changes, and the stored values would no longer say which mood was chosen.
- _A locked mood that greys out the single settings_ — rejected: one more step (choose Custom
  first) for a change the user already asked for.
- _A mood on top of single-setting overrides_ (store each changed setting beside the mood) —
  rejected: three sources for one value, and "which mood is this?" no longer has an answer.
- _Each picture paced by the tempo of the song playing at its start_ — rejected for now: a
  per-slide target in `slideDurationsMs` for a gain only in playlists of very different tempos;
  the beat snap already lands every change on the playing song's beats.
- _Fill the music and round to phrases_ — rejected: the pace would then depend on the number of
  pictures, not on the mood.

## Consequences

- Adding a mood is one table row, its catalogue names and a row in the mapping tests.
- A slideshow under a mood looks the same in the in-app player, the video export, the web page,
  the share page and the TV, since all of them compose through `composeSlideshow`.
- The Mood sheet previews with the real player on the first pictures, not with an imitation.
