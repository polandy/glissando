# ADR-0057: A late picture holds the show

**Status:** accepted (owner decision on issue #349)

## Context

A slide's picture may not be loaded when its slide comes on screen: a server slideshow fetches
its previews while it plays, and one slow Immich answer makes a picture late. Measured with
`scripts/probe-playback-stutter/probe.mjs --picture-delay-ms` on a server show, a late picture
froze the previous picture and silenced the music for the whole wait.

## Options

1. **Hold the show (picture and music stay in sync)**: a late picture stops the show visibly and
   audibly; the beat-aligned picture changes stay on the beat once it resumes.
2. **The clock and the music run on**: the last frame drawn stays on screen until the late
   picture arrives; it is then shown for the rest of its slot, or skipped if its slot has
   passed. The show keeps the music's schedule, but a late picture loses some or all of its
   time on screen.
3. **Prepare faster** (more previews fetched at once, a larger pre-roll): fewer late pictures,
   but no answer for the one that is late anyway. Independent of 1 and 2.

## Decision

Option 1, with option 3 (ADR-0058) so that a picture is late far less often. Every picture gets
its whole slot and stays where it falls on the music; a pause is preferred over a picture cut
short or skipped.

## Consequences

A late picture holds the clock and pauses the music, and the player reports `waiting`; both
resume from the same time once it is drawable, and `playing` follows. A picture that fails to
load at its turn stops the player with an error. A clip the browser refuses is not a late
picture and keeps its own handling (`PLAYER_API.md`).
