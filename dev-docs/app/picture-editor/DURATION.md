# Duration

- **Duration** (`DurationSection.svelte`): below the caption, the eyebrow "Duration" with the
  state "Automatic" or "Own duration" (accent-tinted); a stepper − "5.0 s" + (mono, announced
  politely) in half-second steps from 2 to 15 s, − and + looking disabled (`aria-disabled`) at
  the bounds. The first step from an automatic duration off the half-second grid (shared music
  can leave it off the grid) rounds to the next grid value in the step's direction — up for +,
  down for − — and makes it the picture's own; on the grid, + and − move by half a second as
  usual. The hint follows the case: without music "The slideshow's seconds per picture. − and +
  make it this picture's own." or, own, "Automatic would be 5.0 s, the slideshow's seconds per
  picture."; with music "The music is shared evenly across the 7 pictures without an own
  duration." or, own, "The other 7 pictures share the rest of the music: 4.6 s each." or, when
  the own durations use up the music, "The music is used up; the other 7 pictures get the
  minimum, 2.0 s each." or, when every picture has its own, "Every picture has its own
  duration; the slideshow no longer follows the music's length." — each followed by "2 to
  15 s." The count is of pictures; "each" is a single slide's share, a portrait pair's slide
  getting 1.5 times it, and "used up" means that share fell below the minimum (ADR-0028). A
  paired picture shows its pair's duration. Then "Back to automatic"
  (disabled-looking and titled "The duration is already automatic" while it is); the toast
  "Duration back to automatic" with "Undo" follows. How durations share the music:
  `dev-docs/COMPOSITION.md`.
