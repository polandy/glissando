# ADR-0049: A new slideshow starts on Calm unless the import set the pace

**Status:** accepted

## Context

A slideshow's mood (ADR-0045) is absent, that is Custom, until it is chosen in the Mood sheet.
The import never chose one, so every new slideshow opened as "Custom · default" and played
plain 5-second pictures with the standard transition, while the paced moods stayed hidden behind
"Change". A mood ignores the stored picture length and seconds, so a mood chosen at creation
would override what the import's music step offers: "Time per picture" and "Fill the music".

## Decision

- **A new slideshow starts on Calm** (`buildStoredSlideshow`) when the import left the pace as
  it was: seconds per picture at `DEFAULT_SECONDS_PER_PICTURE` and the pictures lasting their
  seconds (`pictureLength` = `"seconds"`).
- **An explicit pace keeps Custom.** Other seconds per picture or "Fill the music" create the
  slideshow on Custom with those settings, so a choice the user made is never discarded.
- The single settings are stored as the import set them, so "Back to Custom" brings back the
  import's pace.

## Options weighed

- _Always Calm_ — rejected: a pace set in the import would be stored but have no effect until
  the user found Custom.
- _The mood by the music's tempo_ (Lively for a fast song) — rejected: the beats are only known
  after the background analysis, so the mood would change seconds after creation, and a
  slideshow without music would still need a fixed default.
- _Custom with a clearer label_ — rejected: it leaves the paced moods undiscovered for most
  slideshows.

## Consequences

- With the import's untouched "Time per picture" (5 s) the slideshow plays Calm's ~7 s, paced to
  the beat; the import's step still names 5 s until that setting leaves the import (`TODO.md`).
- An e2e case that needs Custom pacing after an import sets the pace in the music step or
  chooses Custom in the Mood sheet.
