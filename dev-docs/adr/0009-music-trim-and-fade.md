# ADR-0009: The music's excerpt and fades are optional fields on the stored music

**Status:** accepted

## Context

The music editor (roadmap 1, `dev-docs/SCOPE.md`; mockup:
https://polandy.github.io/glissando-assets/mockups/music-trim/) lets the user play only part of
the track and choose how it fades in and out. Until then the whole track played, from its
start, at full volume, and the pictures without an own duration shared its whole length
(ADR-0008). Four questions need an answer: how the track is cut, where the choice is stored,
what the player is told, and what happens when the slideshow and the excerpt differ in length.

## Decision

`StoredMusic` gains an optional `trim` (`{ startMs, endMs }`, whole ms within the track, at
least 5 s long) and optional `fadeInMs` and `fadeOutMs` (whole ms, 0 to 10 s in half-second
steps, 0 being off; the editor offers off, short 2 s and long 5 s). Following ADR-0006 and
ADR-0008, absent means the whole track and automatic fades, "whole track" and "back to
automatic" delete the field, and the values are validated where they enter (`setMusicTrim`,
`setMusicFadeIn`, `setMusicFadeOut` and the `.glissando` reader). The file is never changed:
the excerpt is cut while playing.

- **The excerpt's length replaces the track's** in the slide timing; nothing else about it
  changes (ADR-0008).
- **Automatic fades only where the music is cut**: a short fade-in when the excerpt starts after
  the track's start, a short fade-out when the music stops before the track's end.
- **The music is heard until the excerpt's end or the slideshow's, whichever comes first**: a
  longer slideshow plays its last pictures in silence after the fade-out; a shorter one fades
  the music out as it ends.
- **The composer resolves everything**: the slideshow JSON (version 2) carries
  `music: { src, startMs, endMs, fadeInMs, fadeOutMs }` with `endMs` the audible end and the
  fades as played (scaled down in proportion when together they would outlast what is heard).
  The player applies the volume as a pure function of play time. Version 1 is still read, as
  the whole track without fades.
- **The volume goes through Web Audio**: the music's audio element feeds a `GainNode`, set at
  the context's current time, because iOS and iPadOS ignore `HTMLMediaElement.volume`. Where
  `AudioContext` is missing or cannot be made, the element's own volume is the fallback.

The `.glissando` format goes to version 5, whose music may carry the three fields; versions 1
to 4 are still read.

## Options weighed

- _Cut the file itself_ — rejected: browsers decode MP3 and AAC but cannot encode them, so a
  cut file would be a much larger WAV, and "whole track" could never come back.
- _Store the excerpt on the slideshow (`musicTrim`)_ — rejected: replacing the music would leave
  it on a track it was never chosen for.
- _Send "automatic" to the player_ — rejected: the player would need the app's rules and the
  pictures' timing to know where the music is cut and where it is last heard.
- _Loop the music when the slideshow is longer_ — rejected for now: a hard restart sounds worse
  than silence after a fade-out; it may become an option of its own later.

## Consequences

- The excerpt and fades stay with their track and go with it when the music is replaced.
- Every `.glissando` file is written as version 5; an older app reports it as coming from a
  newer version. Every composed slideshow JSON is version 2.
- Records in IndexedDB need no migration: music without the fields plays whole, fading
  automatically, which for the whole track filling the slideshow means no fade at all.
- The music editor offers no undo toast: a reset is one tap away from what it replaced.
- The page's `AudioContext` must be resumed within the gesture that starts playback, or iOS keeps
  it silent; the music then also follows iOS's media session rather than the ring/silent switch
  (`navigator.audioSession.type = "playback"` where Safari has it). In the fallback, fades are
  lost on iOS only.
