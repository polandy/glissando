# ADR-0023: A slideshow plays a playlist of songs, crossfading between them

**Status:** accepted; for a music shorter than the slideshow, amended by ADR-0047

## Context

A slideshow had at most one song, chosen only in the import (ADR-0009). A long slideshow needs
several, and a slideshow made without music had no way to get one. Mockup:
https://polandy.github.io/glissando-assets/mockups/playlist/. Four questions need an answer:
how the songs are stored, how one hands over to the next, how the pictures meet a playlist, and
what the player and the exports are told.

## Decision

- **An ordered list of songs**: `StoredSlideshow.songs` (`readonly StoredMusic[]`, empty for no
  music) replaces `music`. Each song keeps its own excerpt, fades and picture changes (ADR-0009,
  ADR-0021), which travel with it through reorder. Nothing reads the single `music` any more:
  there is no installation to carry over, so a local database holding a slideshow with a
  single `music` is cleared by hand (the browser's site data); the app does not read it.
- **The hand-over is the slideshow's**: `StoredSlideshow.betweenSongs` absent crossfades,
  `"sequence"` plays one after another. In a crossfade the next song starts while the previous
  one fades out: the two overlap by the outgoing song's fade-out as played, and an automatic
  fade on either side of a join is 3 s (`CROSSFADE_MS`); an own fade is kept, so an own fade-out
  of "off" leaves no overlap: the next song starts as the previous one stops, still fading in
  automatically. One after another, the next song starts at the previous one's end,
  and each song's automatic fades follow ADR-0009 (short in, long out, only where the song is
  cut). The playlist's start and its end follow ADR-0009 as for one song.
- **The pictures meet the playlist as they met one song** (ADR-0022): "Fill the music" fills the
  playlist's length (the excerpts' sum less the overlaps). The beats are each song's excerpt
  beats placed at its start in the playlist; inside an overlap only the incoming song's count; a
  song with picture changes "Evenly" contributes none. A slideshow shorter than the playlist
  fades out with its last picture, and the songs it never reaches are not played; they stay in
  the list, dimmed as "Not reached", and play once the slideshow grows. A longer slideshow plays
  its last pictures in silence.
- **The composer resolves every song**: the slideshow JSON goes to version 3, whose `music` is a
  list of tracks, each `{ src, atMs, startMs, endMs, fadeInMs, fadeOutMs }` with `atMs` where in
  the slideshow it starts; tracks never reached are left out. The player runs one audio element
  per track, two at once in a crossfade, each with its own gain envelope. Earlier versions are
  refused.
- **Songs are added and removed in the music editor** — also for a slideshow made without music,
  which the slideshow's panel now offers "Add music" for — and the import's music step takes
  several. A removed song's media goes with the usual clean-up of unreferenced media.
- `.glissando` goes to version 10, whose manifest carries `songs` and `betweenSongs`; earlier
  versions are refused. The server document carries the same fields.

## Options weighed

- _Play the songs back to back only_ — rejected as the only way: the gap and the jump in loudness
  between two songs is the most audible seam of a long slideshow; kept as the alternative.
- _Store the hand-over per song_ — rejected: one choice per join is fine-grained control nobody
  asked for, and reorder would carry it to joins it was never chosen for.
- _A fixed crossfade, ignoring own fades_ — rejected: an own fade-out is a choice about how that
  song ends; it becomes the length of the crossfade.
- _Drop the songs the slideshow never reaches_ — rejected: shortening the pictures for a moment
  would lose them for good.
- _Concatenate the songs into one file_ — rejected for the reasons of ADR-0009: the browser cannot
  encode MP3 or AAC, and reorder or a new excerpt would need a new file.

## Consequences

- Every `.glissando` file is written as version 10 and every composed slideshow JSON as
  version 3; an older app reports them as coming from a newer version.
- The player can sound two songs at once; on iOS both go through the page's one `AudioContext`
  (ADR-0009).
- The video export mixes the tracks into one audio stream; the web page export embeds every song
  it plays, so it grows with the playlist.
