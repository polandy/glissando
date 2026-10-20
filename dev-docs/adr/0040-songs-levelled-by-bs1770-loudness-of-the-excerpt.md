# ADR-0040: Songs are levelled by their BS.1770 loudness over the excerpt, measured once per file

**Status:** accepted

## Context

A playlist mixes songs mastered at very different levels: a modern pop master plays 10–15 dB
louder than a piano recording. The owner wants every song to sound equally loud without a
setting, and a per-song volume on top (mockup:
https://polandy.github.io/glissando-assets/mockups/track-volume/). The player and the video
export must play the same mix; the measurement has to run offline, in the browser, on a phone.

## Options

- **Measure:** RMS of the samples (simple, but bass-heavy music reads too loud and silence
  pulls it down), or integrated loudness per ITU-R BS.1770 (K-weighted, gated — what streaming
  services level by; two biquads and a block sum more).
- **Over what:** the whole file (one number), or the excerpt that plays (a trimmed loud chorus of
  a song with a quiet intro would otherwise stay too loud).
- **When:** while composing (decoding every song before each play), or once per file in the
  background, stored beside the beats.
- **Target:** an absolute level (a song's gain does not depend on the playlist), or the level
  the quietest song can reach (louder, but adding a song changes the others).

## Decision

BS.1770 integrated loudness, levelled to −14 LUFS, over the excerpt. A background pass decodes
each file once at full rate and stores its 400 ms block loudnesses and 100 ms sample peaks
beside the beats; any excerpt's loudness and peak follow from the blocks without decoding again,
so a new trim re-levels at once. Own volume moves a song −12 to +6 dB from the levelled default.
The gain never pushes the excerpt's peak past −1 dBFS: a quiet song with loud peaks stays short
of the target, and the editor says so. The composer resolves one linear gain per song into the
slideshow, which the player and the video export apply alike.

## Consequences

- A song plays unlevelled until its pass finished; the editor shows "Measuring…".
- The full-rate decode is separate from the beat decode (11 025 Hz mono would underestimate the
  peaks), so a file is decoded twice in the background, one song at a time — about 100 MB
  transient memory for a 5-minute stereo song.
- −14 LUFS turns loud masters down by ~5 dB compared with playing the file as it is; the TV's
  volume makes up for it.
- Sample peak, not true peak: an inter-sample overshoot may pass the ceiling by a fraction of a
  dB, inside the 1 dB margin.
