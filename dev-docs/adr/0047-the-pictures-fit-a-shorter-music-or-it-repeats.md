# ADR-0047: The pictures fit a shorter music, or the music repeats on a tap

**Status:** accepted

## Context

With music shorter than the slideshow — 0:20 under 0:30 — the last pictures play in silence
(ADR-0009, ADR-0022, ADR-0023) and the music editor only says "Last pictures in silence". The
product principle "good without effort" (`dev-docs/SCOPE.md`) wants no silent ending the user
has to notice and fix alone. Three things cause it: pictures that last their own seconds
(ADR-0022, the default) and a mood (ADR-0045) never look at the music's length, and "Fill the
music" gives every picture the minimum of 2 s once its share falls below it. Three questions need
an answer: when the pictures adapt by themselves, how far, and what the user is offered beyond.

## Decision

- **The pictures fit a shorter music by themselves**: when the pictures without an own duration,
  at their own seconds or their mood's length, would outlast the playlist, they share the
  playlist instead, as "Fill the music" does (ADR-0022, ADR-0023), so the slideshow ends with the
  music. Own durations are kept (ADR-0008); energy pacing and the beats then work on the fitted
  durations as on filled ones (ADR-0046, ADR-0021). Nothing is stored: the fit is worked out
  each time the slideshow is composed, so adding pictures or a song re-fits it.
- **Down to ⅔ of the picture length, never below 2 s**: a picture may shrink to ⅔ of its
  seconds (Calm 7 → 4.7 s, 5 s → 3.3 s, Lively 3 → 2 s), so the slideshow keeps its pace. When
  even that would outlast the music, the pictures keep their full length — a squeeze that still
  ends in silence only spoils the pace — and the editors offer a fix.
- **The fix is one tap**: where the music editor and the import's music step said the last
  pictures play in silence, a note says by how much the music ends first, with "Repeat the
  music" and "Add a song" (the existing song picker). "Fill the music" below the minimum shows
  the same note.
- **Repeating the music is a choice of the slideshow**: `StoredSlideshow.repeatMusic` `true`
  plays the playlist again from its first song for as long as the slideshow lasts, joined like
  any two songs (`betweenSongs`, ADR-0023), the last one heard fading out with the last picture;
  absent, the playlist plays once. With it on, the pictures keep their length: there is no gap to
  fit. The composer resolves the repeats into further tracks of the slideshow JSON, each with its
  own `atMs`, and the beats and energy repeat with them; the player is unchanged.
- `.glissando` goes to the next version, which carries `repeatMusic`; earlier versions are
  refused. The server document carries it under the same rules.

This replaces "a shorter song leaves the last pictures in silence" in ADR-0009 and ADR-0022,
"a longer slideshow plays its last pictures in silence" in ADR-0023 and "a mood never fills the
music" in ADR-0045 for a music shorter than the slideshow; a longer music still fades out with
the last picture.

## Options weighed

- _Repeat the music by itself, without asking_ — rejected: nobody chose to hear the song twice;
  squeezing keeps what the user picked, a repeat changes it.
- _Always repeat, never squeeze_ — rejected: a 0:28 song under a 0:30 slideshow would restart
  for two seconds where a slightly shorter picture time hides the gap.
- _Squeeze down to the minimum of 2 s_ — rejected: a Calm slideshow at 2 s a picture is no
  longer calm; ⅔ keeps the mood recognisable.
- _Squeeze to the floor even when silence remains_ — rejected: it spoils the pace and still needs
  the fix.
- _Repeat only the last song_ — rejected: with a playlist it sounds arbitrary; the whole
  playlist again is what "repeat" means in every player.
- _Store the fitted seconds_ — rejected: they would go stale with every added picture or song.

## Consequences

- A slideshow with a shorter music changes length with the music: it ends where the music ends.
- The music editor's note and the import's summary name the fitted length ("about 3.3 s each
  to end with the music") so the change is visible.
- Every `.glissando` file is written in the new version; an older app reports it as coming from
  a newer version.
- The web page export embeds each song once however often it repeats.
