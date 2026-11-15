# ADR-0057: A late picture never silences the music

**Status:** accepted (decided on issue #349 by recommendation; the owner confirms there)

## Context

A slide's picture may not be loaded when its slide comes on screen: a server slideshow fetches
its previews while it plays, and one slow Immich answer makes a picture late. The player held
the show clock and paused the music until the picture was drawable, then resumed both. Measured
with `scripts/probe-playback-stutter/probe.mjs --picture-delay-ms` on a server show, one late
picture froze the previous picture **and** silenced the music for the whole wait.

## Options

1. **Hold the show (picture and music stay in sync)**: a late picture stops the show visibly and
   audibly; the beat-aligned picture changes stay on the beat once it resumes.
2. **The clock and the music run on**: the last frame drawn stays on screen until the late
   picture arrives; it is then shown for the rest of its slot, or skipped if its slot has
   passed. The show keeps the music's schedule and ends on time.
3. **Prepare faster** (more previews fetched at once, a larger pre-roll): fewer late pictures,
   but no answer for the one that is late anyway. Independent of 1 and 2.

## Decision

Option 2, and option 3 as its own change. A slideshow with music is paced by the music: a silent
gap is heard as a defect, a picture shown a second late is not.

## Consequences

Mid-show, a late picture shows as a frozen picture only, never as silence; the player reports
`waiting` and `playing` around it, as a video element does. A picture that arrives after its slot
is never drawn. Starting, resuming and seeking still wait for their pictures before the music
starts, since nothing is on screen to hold. A picture that fails to load at its turn still stops
the player with an error.
