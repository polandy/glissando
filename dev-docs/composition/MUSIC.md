# Music

`resolvePlaylist` (ADR-0009, ADR-0023): the songs (`StoredSlideshow.songs`) play in order, each
from its excerpt's start. With `betweenSongs` absent each crossfades into the next: the next
song starts where the previous one's fade-out starts, so the two overlap by that fade-out as
played, and an automatic fade on either side of a join is `CROSSFADE_MS` (3 s). An overlap never
exceeds the next song's excerpt nor reaches back past the end of the song before, so at most two
sound at once. With `"sequence"` each song starts at the previous one's end. An own fade
(`StoredMusic.fadeInMs`, `fadeOutMs`, 0 being off) is always kept, so an own fade-out of off makes
a hard cut. Every other automatic fade follows ADR-0009: short (2 s) in, long (5 s) out where
cut, off where a track starts or ends by itself — the first song's fade-in, the last song's
fade-out, and both of every song one after another. The playlist is heard until its end or the
slideshow's, whichever comes first: a longer slideshow plays its last pictures in silence; a
shorter one leaves out the songs it never reaches and ends the ones heard at its end there, with
their own fade-out or an automatic long one — the usual case when the pictures last their own
seconds. Fades that together outlast what is heard of a song are scaled down in proportion.
Changing the pictures on the beat moves no music: the excerpts and their fades stay as they are.
