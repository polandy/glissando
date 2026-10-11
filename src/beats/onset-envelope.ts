import { fft } from "./fft";

/** Samples per analysis frame (ADR-0021); a power of two for the FFT. */
export const FRAME_SAMPLES = 512;
/** Samples from one frame's start to the next. */
export const HOP_SAMPLES = 128;
/** How strongly quiet partials count against loud ones in the log-compressed spectrum. */
const SPECTRUM_COMPRESSION = 100;
/** Half the window the local mean is taken over: the flux above it is an onset. */
const LOCAL_MEAN_HALF_WINDOW_SECONDS = 0.2;

/** How sharply the music's sound changes, frame by frame: high where a note or drum starts. */
export interface OnsetEnvelope {
  /** The strength per frame, scaled to a root mean square of 1. */
  readonly strengths: Float32Array;
  readonly framesPerSecond: number;
}

/**
 * The spectral flux (the rise of the log-compressed spectrum from one frame to the next, summed
 * over the frequencies) minus its local mean, half-wave rectified and normalised.
 */
export function onsetEnvelope(samples: Float32Array, sampleRate: number): OnsetEnvelope {
  const framesPerSecond = sampleRate / HOP_SAMPLES;
  const flux = spectralFlux(samples);
  const strengths = aboveLocalMean(
    flux,
    Math.round(LOCAL_MEAN_HALF_WINDOW_SECONDS * framesPerSecond),
  );
  normalise(strengths);
  return { strengths, framesPerSecond };
}

function spectralFlux(samples: Float32Array): Float32Array {
  const frameCount = Math.max(0, Math.floor((samples.length - FRAME_SAMPLES) / HOP_SAMPLES) + 1);
  const bins = FRAME_SAMPLES / 2;
  const window = hannWindow(FRAME_SAMPLES);
  const real = new Float64Array(FRAME_SAMPLES);
  const imaginary = new Float64Array(FRAME_SAMPLES);
  let previous = new Float32Array(bins);
  let current = new Float32Array(bins);
  const flux = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * HOP_SAMPLES;
    for (let index = 0; index < FRAME_SAMPLES; index += 1) {
      real[index] = (samples[start + index] ?? 0) * (window[index] ?? 0);
      imaginary[index] = 0;
    }
    fft(real, imaginary);
    let rise = 0;
    // Bin 0 is the constant offset, not a sound.
    for (let bin = 1; bin < bins; bin += 1) {
      const level = Math.log1p(
        SPECTRUM_COMPRESSION * Math.hypot(real[bin] ?? 0, imaginary[bin] ?? 0),
      );
      current[bin] = level;
      const change = level - (previous[bin] ?? 0);
      if (change > 0 && frame > 0) {
        rise += change;
      }
    }
    flux[frame] = rise;
    [previous, current] = [current, previous];
  }
  return flux;
}

function hannWindow(size: number): Float32Array {
  return Float32Array.from(
    { length: size },
    (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / size),
  );
}

function aboveLocalMean(values: Float32Array, halfWindow: number): Float32Array {
  const count = values.length;
  const prefixSums = new Float64Array(count + 1);
  for (let index = 0; index < count; index += 1) {
    prefixSums[index + 1] = (prefixSums[index] ?? 0) + (values[index] ?? 0);
  }
  return Float32Array.from(values, (value, index) => {
    const from = Math.max(0, index - halfWindow);
    const to = Math.min(count, index + halfWindow + 1);
    const mean = ((prefixSums[to] ?? 0) - (prefixSums[from] ?? 0)) / (to - from);
    return Math.max(0, value - mean);
  });
}

/** Scales to a root mean square of 1; silence stays all zero. */
function normalise(values: Float32Array): void {
  const meanSquare =
    values.reduce((sum, value) => sum + value * value, 0) / Math.max(1, values.length);
  const rootMeanSquare = Math.sqrt(meanSquare);
  if (rootMeanSquare === 0) {
    return;
  }
  values.forEach((value, index) => (values[index] = value / rootMeanSquare));
}
