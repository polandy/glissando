# ADR-0022: With music the pictures keep their own length, on the beat, unless they fill the music

**Status:** accepted

## Context

Until now a slideshow with music always stretched or squeezed the pictures without an own
duration to the music's excerpt (ADR-0008, ADR-0009), so a 4-minute song made 24 pictures last
10 s each, and the seconds per picture chosen in the import only counted without music. Since the
pictures change on the music's beats (ADR-0021), a picture length can be chosen freely and still
sit on the music. Mockup: https://polandy.github.io/glissando-assets/mockups/beat-durations/.
Three questions need an answer: where the choice is stored, what existing slideshows do, and how
"about 5 s" meets the beats.

## Decision

- **A choice of the slideshow**: `StoredSlideshow.pictureLength` `"seconds"` has the pictures
  without an own duration last `secondsPerPicture` each with music too; absent, they fill the
  music as before. It sits beside `secondsPerPicture`, which the music editor can now change
  too (half seconds, 2 to 15 s).
- **New slideshows last their seconds**: the import writes `"seconds"` unless the user picks
  "Fill the music" in the music step. Records and files without the field — every slideshow made
  before — fill the music, so nothing changes under them and nothing is migrated.
- **About N s, on the beat**: each automatic boundary aims where it would fall without beats and
  moves to the nearest beat that leaves both neighbours at least the minimum (`snapToBeats`, as
  for filling), so the shifts never add up. The last automatic slide's end moves too, to the
  nearest beat within its slack above the minimum, and the own durations after it follow; so
  the slideshow ends on a beat, about as long as its pictures. Without a beat, or with picture
  changes "Evenly", every picture stays exactly N s.
- **The music follows the slideshow** (ADR-0009, unchanged): a longer song is heard until the
  slideshow ends and fades out there (automatically 5 s); a shorter one leaves the last pictures
  in silence.
- `.glissando` goes to version 9, which carries `pictureLength`; the server document carries it
  under the same rules.

## Options weighed

- _Replace "fill the music" altogether_ — rejected: a slideshow made to end with its song would
  change length under the user, and some want exactly that ending.
- _Store the choice on the music, like the picture changes_ — rejected: the length belongs to the
  pictures; replacing the music would drop or carry over a choice the user made about them.
- _Absent means "seconds", with a database upgrade marking older slideshows as filling_ —
  rejected: server slideshows and older `.glissando` files would need the same rewrite; absent
  meaning "fill" needs none.
- _Snap the k-th change k beats after the last_ (a beat count per picture) — rejected: with a
  song that changes tempo the length drifts from the chosen seconds; aiming at k × N keeps it.

## Consequences

- An existing slideshow keeps filling its music until the user picks "About 5 s each".
- The slideshow's length with music is known only roughly before the beats are found; the
  import shows it without beats, the editors and the player with the beats found so far.
- Every `.glissando` file is written as version 9; an older app reports it as coming from a
  newer version.
