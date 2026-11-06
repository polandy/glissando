# ADR-0051: A song is decoded once, at full rate, for its beats and loudness

**Status:** accepted; amends ADR-0021 (decoding) and ADR-0040 (the separate decode)

## Context

A song was decoded twice in the background on the main thread: at 11 025 Hz mono for the beats
(ADR-0021) and at the device's own rate with every channel kept for the loudness (ADR-0040). Each
decode is the browser's native code and holds the whole song in memory; on a phone the two add
up, and the beat and loudness passes were the
same background pass written twice, with two workers and two worker clients.

## Options

1. **Keep two decodes.** Each consumer gets its ideal rate from the browser; the cost is two
   decodes per song and two copies of the pass.
2. **Decode once, at full rate; share the decoded song between the two passes.** The passes stay
   independent, so the decoded song (about 100 MB for 5 minutes of stereo) would have to be kept
   until both had read it, or decoded again when they drift apart.
3. **Decode once, at full rate, in one pass; one worker derives both (chosen).** The loudness is
   measured from the full-rate channels as before; the beats come from our own mix to mono and
   resampling to 11 025 Hz in the worker.

## Decision

Option 3. `MusicAnalysisPass` (`src/library/music-analysis-pass.ts`) replaces the beat and
loudness passes: for each song without beats or loudness it decodes once at the device's rate
(`src/music-analysis/decode-music-full-rate.ts`) and hands every channel to one worker
(`src/music-analysis/analysis-worker.ts`), which measures the loudness, mixes and resamples to
11 025 Hz with a windowed-sinc low-pass (`mix-to-detection-rate.ts`) and finds the beats. The
decode stays on the main thread, where `OfflineAudioContext` lives.

## Consequences

- One background decode per song and device, one song at a time; the transient memory is
  ADR-0040's.
- The beats come from our resampler (Kaiser-windowed sinc), not the browser's; on the ADR-0021
  generated tracks rendered at 44.1 and 48 kHz they sit within 7–9 ms of the true beats, as when
  decoded at 11 025 Hz directly. Resampling 20 minutes of 48 kHz stereo takes about 1 s in the
  worker.
- Beats and loudness are found together: a failure loses both until the next pass.
- The `.glissando` check still decodes each song once to prove it plays (ADR-0038); that is a
  check, not an analysis, and keeps its own low rate.
