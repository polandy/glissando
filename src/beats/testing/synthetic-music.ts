/**
 * Generated music with known beat times, synthesised sample by sample: no recording is ever
 * used. Noise comes from a seeded generator, so a track is the same on every run.
 */

/** The rate the detector analyses at (ADR-0021); low enough to keep the tests fast. */
export const SYNTHETIC_SAMPLE_RATE = 11_025;

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
/** No beat is placed this close to the track's end, so its sound is not cut off. */
const END_MARGIN_SECONDS = 0.5;

export interface SyntheticTrack {
  readonly samples: Float32Array;
  readonly sampleRate: number;
  /** Where the beats truly are, in ms of the track. */
  readonly beatsMs: readonly number[];
}

/** A deterministic generator of values in [-1, 1) (a linear congruential generator). */
export function seededNoise(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return (state / 2 ** 32) * 2 - 1;
  };
}

/** A sound as a function of the time since its start, in seconds. */
type Sound = (seconds: number) => number;

const kick: Sound = (t) =>
  Math.sin(2 * Math.PI * (50 + 100 * Math.exp(-t * 30)) * t) * Math.exp(-t * 8);
const click: Sound = (t) => Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-t * 80);
const tone =
  (hz: number): Sound =>
  (t) =>
    (Math.sin(2 * Math.PI * hz * t) + 0.3 * Math.sin(4 * Math.PI * hz * t)) *
    Math.exp(-t * 2.5) *
    0.4;
const snare =
  (noise: () => number): Sound =>
  (t) =>
    (noise() * 0.7 + 0.3 * Math.sin(2 * Math.PI * 200 * t)) * Math.exp(-t * 18);
const hat =
  (noise: () => number): Sound =>
  (t) =>
    noise() * Math.exp(-t * 60) * 0.3;

function addSound(
  samples: Float32Array,
  atSeconds: number,
  sound: Sound,
  lengthSeconds: number,
): void {
  const start = Math.round(atSeconds * SYNTHETIC_SAMPLE_RATE);
  const length = Math.round(lengthSeconds * SYNTHETIC_SAMPLE_RATE);
  for (let index = 0; index < length && start + index < samples.length; index += 1) {
    samples[start + index] = (samples[start + index] ?? 0) + sound(index / SYNTHETIC_SAMPLE_RATE);
  }
}

/** Calls `onBeat` for each beat of a steady tempo and returns the beat times. */
function steadyBeats(
  seconds: number,
  beatsPerMinute: number,
  firstBeatSeconds: number,
  onBeat: (atSeconds: number, beatIndex: number, periodSeconds: number) => void,
): number[] {
  const periodSeconds = SECONDS_PER_MINUTE / beatsPerMinute;
  const beatsMs: number[] = [];
  for (
    let index = 0, at = firstBeatSeconds;
    at < seconds - END_MARGIN_SECONDS;
    index += 1, at = firstBeatSeconds + index * periodSeconds
  ) {
    beatsMs.push(at * MILLISECONDS_PER_SECOND);
    onBeat(at, index, periodSeconds);
  }
  return beatsMs;
}

function emptySamples(seconds: number): Float32Array {
  return new Float32Array(Math.round(seconds * SYNTHETIC_SAMPLE_RATE));
}

/** A short high click on every beat, nothing else. */
export function clickTrack(seconds: number, beatsPerMinute: number): SyntheticTrack {
  const samples = emptySamples(seconds);
  const beatsMs = steadyBeats(seconds, beatsPerMinute, 0.37, (at) =>
    addSound(samples, at, click, 0.1),
  );
  return { samples, sampleRate: SYNTHETIC_SAMPLE_RATE, beatsMs };
}

/** Kick and snare in turn on the beats, hats on and between them, a bass line under it. */
export function drumPattern(seconds: number, beatsPerMinute: number, seed: number): SyntheticTrack {
  const noise = seededNoise(seed);
  const samples = emptySamples(seconds);
  const bassHz = [110, 147, 165, 98];
  const beatsMs = steadyBeats(seconds, beatsPerMinute, 0.81, (at, index, period) => {
    addSound(samples, at, index % 2 === 0 ? kick : snare(noise), 0.5);
    addSound(samples, at, hat(noise), 0.1);
    addSound(samples, at + period / 2, hat(noise), 0.1);
    addSound(samples, at, tone(bassHz[Math.floor(index / 4) % bassHz.length] ?? 0), 1.2);
  });
  return { samples, sampleRate: SYNTHETIC_SAMPLE_RATE, beatsMs };
}

/** Soft piano-like tones on the beats, a low one on every fourth; no drums. */
export function drumlessBallad(seconds: number, beatsPerMinute: number): SyntheticTrack {
  const samples = emptySamples(seconds);
  const melodyHz = [262, 330, 392, 349];
  const beatsMs = steadyBeats(seconds, beatsPerMinute, 1.05, (at, index) => {
    addSound(samples, at, tone(melodyHz[index % melodyHz.length] ?? 0), 2);
    if (index % 4 === 0) {
      addSound(samples, at, tone(131), 2.5);
    }
  });
  return { samples, sampleRate: SYNTHETIC_SAMPLE_RATE, beatsMs };
}

/** Kick and snare with tones whose tempo rises steadily from `fromBpm` to `toBpm`. */
export function acceleratingDrums(
  seconds: number,
  fromBpm: number,
  toBpm: number,
  seed: number,
): SyntheticTrack {
  const noise = seededNoise(seed);
  const samples = emptySamples(seconds);
  const beatsMs: number[] = [];
  for (let index = 0, at = 0.4; at < seconds - END_MARGIN_SECONDS; index += 1) {
    beatsMs.push(at * MILLISECONDS_PER_SECOND);
    addSound(samples, at, index % 2 === 0 ? kick : snare(noise), 0.4);
    addSound(samples, at, tone(220 + (index % 4) * 30), 0.5);
    const beatsPerMinute = fromBpm + (toBpm - fromBpm) * (at / seconds);
    at += SECONDS_PER_MINUTE / beatsPerMinute;
  }
  return { samples, sampleRate: SYNTHETIC_SAMPLE_RATE, beatsMs };
}

/** A slowly swelling chord with a little noise: music without any beat. */
export function beatlessPad(seconds: number, seed: number): SyntheticTrack {
  const noise = seededNoise(seed);
  const samples = emptySamples(seconds);
  const chordHz = [220, 277, 330];
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / SYNTHETIC_SAMPLE_RATE;
    const chord = chordHz.reduce(
      (sum, hz) => sum + Math.sin(2 * Math.PI * hz * t + Math.sin(t * 0.3) * 2),
      0,
    );
    samples[index] = chord * 0.2 * (0.6 + 0.4 * Math.sin(t * 0.2)) + noise() * 0.02;
  }
  return { samples, sampleRate: SYNTHETIC_SAMPLE_RATE, beatsMs: [] };
}
