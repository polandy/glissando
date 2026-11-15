# ADR-0056: The music is seeked back to the show only after a start or a stall

**Status:** accepted

## Context

Each frame seeks a heard song back to its place once it is more than 150 ms off the show clock
(TIMING.md, Music). On a device busy preparing pictures in workers, the owner heard the music
stutter, in server and imported slideshows alike. Measured in Chromium with 1–2 CPUs: the song's
clock falls behind the show while it plays on, and every resync seek re-buffers for hundreds of
milliseconds and lands behind again, so the next frame seeks once more — 100 to 130 audible gaps a
minute. Without the resync the song played without one gap.

## Options

1. **Resync only after a start or a stall, and accept where a seek lands**: a song that just
   started or stopped playing is seeked once; the drift its seek leaves is its new reference.
2. **A pause between resyncs**: still one gap per pause on a loaded device, never caught up.
3. **Catch up by playback rate**: no gaps, but a change of speed warbles the music, and a song
   whose audio clock itself runs slow never catches up.
4. **The music leads the show clock**: no seeks at all, but pictures, clips, crossfades and the
   parts of a show without music all follow one clock today, so it changes the whole player.

## Decision

Option 1: it keeps a stall from leaving the beat-aligned changes off the beat, and nothing a
loaded device does makes the music seek over and over.

## Consequences

The music plays without gaps while pictures are prepared. On a loaded device a song may stay off
the beat by what its seek or its slow clock left — up to the next stall or start — rather than
stutter. E2E-132 replays the seek storm with a music element that starts and seeks late.
