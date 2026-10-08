# ADR-0002: Transitions run inside slide durations

**Status:** accepted

## Context

A slideshow has slide durations and transition durations. The MVP fits slide timing to the
music's length, and without music every picture "stays 5 s" (`dev-docs/SCOPE.md`). Where the
transition time sits decides how simple both are.

## Decision

A transition runs during the last part of the outgoing slide's `durationMs`. The slideshow
lasts the sum of its slide durations. The incoming slide's Ken Burns starts with the transition.

## Options weighed

- _Transitions between slides, adding to the total_ (gre/diaporama) — each slide holds alone for
  its full duration; rejected because fitting a track then needs both durations, and changing a
  transition changes the slideshow's length.
- _Transitions centred on the boundary_ — symmetric; rejected because both neighbours' durations
  then constrain each transition, and the first and last slides become special cases.

## Consequences

- Fitting music is one division: track length over picture count.
- A slide is alone on screen for its duration minus its outgoing transition; a transition can
  never be longer than its slide (the parser rejects it).
