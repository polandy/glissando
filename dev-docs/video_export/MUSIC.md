# Music

- The video carries every track of the slideshow's music (PLAYER.md), mixed into one audio
  stream. `runVideoExport` reads each song by a track's `src` through `openMusic`, and each
  distinct song is decoded once (`decodeAudioData`). The mix is rendered in 30 s segments, each in
  its own `OfflineAudioContext` (2 channels, 48 kHz): every track heard in the segment gets a
  source started at its place (`atMs`) or, when it began before the segment, at `startMs` plus
  the time since its place; its own gain follows `trackGainAt` (ADR-0009, ADR-0023) as linear
  ramps between its fade boundaries (`trackGainRamps`), silent before its place, each ramp point
  then scaled by the track's own `gain` (ADR-0040, `scaleGainPoints`) — the same levelling the
  player applies. The duck (ADR-0035) stays on the music bus, after this per-track levelling; a
  clip's own sound is not levelled. In a crossfade two tracks sum. So the export holds the decoded
  songs plus one segment, never the whole mix.
- The audio track is exactly as long as the video; after the audible end it is silence.
- Each segment goes to the `AudioEncoder` as `f32-planar` `AudioData` once the video reaches the
  segment's start, so the muxer gets both tracks interleaved.
