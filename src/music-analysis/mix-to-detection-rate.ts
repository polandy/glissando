/**
 * Mixes a decoded song to mono and resamples it to the rate the beat detector works at (ADR-0021),
 * with an anti-alias low-pass of our own instead of the browser's resampler. Pure: no DOM.
 */

/** Cutoff as a share of the lower of the two Nyquist rates: leaves room for the transition band. */
const CUTOFF_SHARE_OF_NYQUIST = 0.9;
/** Kernel half-width in output samples: wider is a steeper low-pass but costs more per sample. */
const KERNEL_HALF_WIDTH_OUTPUT_SAMPLES = 10;
/** Kaiser shape: about 70 dB of stopband, so a tone above the new Nyquist is inaudible to the detector. */
const KAISER_BETA = 7;
/** Sub-sample positions the kernel is precomputed for, so any ratio costs one table lookup. */
const KERNEL_PHASES = 4096;

/** Zeroth-order modified Bessel function, by its power series (converges fast for small x). */
function besselI0(x: number): number {
  const quarterSquare = (x * x) / 4;
  let term = 1;
  let sum = 1;
  for (let k = 1; term > sum * Number.EPSILON; k += 1) {
    term *= quarterSquare / (k * k);
    sum += term;
  }
  return sum;
}

function sinc(x: number): number {
  if (x === 0) return 1;
  return Math.sin(Math.PI * x) / (Math.PI * x);
}

/** Kaiser window over [-1, 1]; zero outside. */
function kaiser(position: number): number {
  if (Math.abs(position) >= 1) return 0;
  return besselI0(KAISER_BETA * Math.sqrt(1 - position * position)) / besselI0(KAISER_BETA);
}

interface Kernel {
  /** Input samples on each side of the output position the kernel reaches. */
  readonly halfWidth: number;
  /** `KERNEL_PHASES` rows of `2 * halfWidth` weights, each row summing to one. */
  readonly weights: Float32Array;
}

function buildKernel(inputRate: number, outputRate: number): Kernel {
  const limitingRate = Math.min(inputRate, outputRate);
  const cutoffCyclesPerSample = (CUTOFF_SHARE_OF_NYQUIST * limitingRate) / 2 / inputRate;
  const halfWidth = Math.ceil((KERNEL_HALF_WIDTH_OUTPUT_SAMPLES * inputRate) / limitingRate);
  const taps = 2 * halfWidth;
  const weights = new Float32Array(KERNEL_PHASES * taps);
  for (let phase = 0; phase < KERNEL_PHASES; phase += 1) {
    const fraction = phase / KERNEL_PHASES;
    const row = new Float64Array(taps);
    let sum = 0;
    for (let tap = 0; tap < taps; tap += 1) {
      const distance = tap - halfWidth + 1 - fraction;
      row[tap] = sinc(2 * cutoffCyclesPerSample * distance) * kaiser(distance / halfWidth);
      sum += row[tap] as number;
    }
    for (let tap = 0; tap < taps; tap += 1) {
      weights[phase * taps + tap] = (row[tap] as number) / sum;
    }
  }
  return { halfWidth, weights };
}

function mixToMono(channels: readonly Float32Array[]): Float32Array {
  const [first] = channels;
  if (!first) throw new Error("mixToDetectionRate needs at least one channel");
  const mono = new Float32Array(first.length);
  for (const channel of channels) {
    for (let index = 0; index < mono.length; index += 1) {
      mono[index] = (mono[index] as number) + (channel[index] as number) / channels.length;
    }
  }
  return mono;
}

function resample(mono: Float32Array, inputRate: number, outputRate: number): Float32Array {
  const { halfWidth, weights } = buildKernel(inputRate, outputRate);
  const taps = 2 * halfWidth;
  const output = new Float32Array(Math.floor((mono.length * outputRate) / inputRate));
  for (let index = 0; index < output.length; index += 1) {
    // Integer arithmetic keeps the position exact however long the song is.
    const scaled = index * inputRate;
    let base = Math.floor(scaled / outputRate);
    let phase = Math.round(((scaled - base * outputRate) * KERNEL_PHASES) / outputRate);
    if (phase === KERNEL_PHASES) {
      base += 1;
      phase = 0;
    }
    const firstInput = base - halfWidth + 1;
    const from = Math.max(0, -firstInput);
    const to = Math.min(taps, mono.length - firstInput);
    let sum = 0;
    for (let tap = from; tap < to; tap += 1) {
      sum += (weights[phase * taps + tap] as number) * (mono[firstInput + tap] as number);
    }
    output[index] = sum;
  }
  return output;
}

/**
 * Every channel averaged into one, at `outputRate`. A song already at that rate is only mixed;
 * otherwise the content above the new Nyquist rate is filtered out first, so it cannot fold into
 * the band the detector listens to.
 */
export function mixToDetectionRate(
  channels: readonly Float32Array[],
  inputRate: number,
  outputRate: number,
): Float32Array {
  const mono = mixToMono(channels);
  return inputRate === outputRate ? mono : resample(mono, inputRate, outputRate);
}
