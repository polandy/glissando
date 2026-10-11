import { NO_BEATS, type MusicBeats } from "./music-beats";
import { FRAME_SAMPLES, HOP_SAMPLES, onsetEnvelope } from "./onset-envelope";
import { estimateTempo } from "./tempo";
import { trackBeats } from "./track-beats";

/** Below this pulse clarity the music has no clear beat (ADR-0021). */
const MIN_PULSE_CLARITY = 2;
/** The tracked beats lead the true ones by this much; measured on generated music. */
const DETECTION_LEAD_MS = 10;
const MILLISECONDS_PER_SECOND = 1000;

/**
 * The beats of a decoded track (mono samples at `sampleRate`, 11 025 Hz in the app): a
 * spectral-flux onset envelope, the tempo by autocorrelation, then the individual beats by
 * dynamic programming. See ADR-0021.
 */
export function detectBeats(samples: Float32Array, sampleRate: number): MusicBeats {
  const { strengths, framesPerSecond } = onsetEnvelope(samples, sampleRate);
  if (strengths.length === 0) {
    return NO_BEATS;
  }
  const tempo = estimateTempo(strengths, framesPerSecond);
  if (!(tempo.clarity >= MIN_PULSE_CLARITY)) {
    return NO_BEATS;
  }
  const frameToMs = (frame: number) =>
    Math.round(
      ((frame * HOP_SAMPLES + FRAME_SAMPLES / 2) / sampleRate) * MILLISECONDS_PER_SECOND +
        DETECTION_LEAD_MS,
    );
  const beatsMs = trackBeats(strengths, tempo.periodFrames).map(frameToMs);
  if (beatsMs.length === 0) {
    return NO_BEATS;
  }
  return { kind: "beats", beatsMs, beatsPerMinute: tempo.beatsPerMinute };
}
