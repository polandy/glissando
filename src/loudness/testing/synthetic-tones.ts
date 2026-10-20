/**
 * Synthesised test signals for loudness measurement: sines and silence built sample by sample.
 * Never a recording — see CLAUDE.md memory on real media in tests.
 */

const MS_PER_SECOND = 1000;

function sampleCount(durationMs: number, sampleRate: number): number {
  return Math.round((sampleRate * durationMs) / MS_PER_SECOND);
}

/** A sine tone of the given amplitude (linear, 0..1 for a clean signal), for `durationMs`. */
export function sineTone(
  frequencyHz: number,
  amplitude: number,
  durationMs: number,
  sampleRate: number,
): Float32Array {
  const length = sampleCount(durationMs, sampleRate);
  const samples = new Float32Array(length);
  const angularStep = (2 * Math.PI * frequencyHz) / sampleRate;
  for (let n = 0; n < length; n += 1) {
    samples[n] = amplitude * Math.sin(angularStep * n);
  }
  return samples;
}

/** Digital silence for `durationMs`. */
export function silence(durationMs: number, sampleRate: number): Float32Array {
  return new Float32Array(sampleCount(durationMs, sampleRate));
}

/** One track made of consecutive segments (e.g. a quiet tone followed by a loud one). */
export function concatSegments(...segments: readonly Float32Array[]): Float32Array {
  const length = segments.reduce((sum, segment) => sum + segment.length, 0);
  const track = new Float32Array(length);
  let offset = 0;
  for (const segment of segments) {
    track.set(segment, offset);
    offset += segment.length;
  }
  return track;
}
