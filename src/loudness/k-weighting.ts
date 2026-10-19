/**
 * ITU-R BS.1770-4 K-weighting: a high shelf (approximating the head's effect on a diffuse
 * sound field) then an RLB high-pass, each a second-order IIR stage. The coefficients come from
 * each stage's analogue prototype, bilinear-transformed with frequency pre-warping (the
 * libebur128 derivation, BS.1770-4 Annex 2), so they are correct at any sample rate, not only
 * the 48 kHz the standard tabulates.
 */

interface Biquad {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
}

const SHELF_FREQUENCY_HZ = 1681.9744509555319;
const SHELF_GAIN_DB = 3.99984385397;
const SHELF_Q = 0.7071752369554193;
/** The shelf's skirt (as opposed to peak) gain, as the exact exponent BS.1770-4 derives it with. */
const SHELF_SKIRT_GAIN_EXPONENT = 0.4996667741545416;

const HIGH_PASS_FREQUENCY_HZ = 38.13547087613982;
const HIGH_PASS_Q = 0.5003270373253953;

/** The pre-warped bilinear-transform frequency variable for a corner frequency at this rate. */
function prewarped(frequencyHz: number, sampleRate: number): number {
  return Math.tan((Math.PI * frequencyHz) / sampleRate);
}

function highShelf(sampleRate: number): Biquad {
  const k = prewarped(SHELF_FREQUENCY_HZ, sampleRate);
  const peakGain = 10 ** (SHELF_GAIN_DB / 20);
  const skirtGain = peakGain ** SHELF_SKIRT_GAIN_EXPONENT;

  const a0 = 1 + k / SHELF_Q + k * k;
  return {
    b0: (peakGain + (skirtGain * k) / SHELF_Q + k * k) / a0,
    b1: (2 * (k * k - peakGain)) / a0,
    b2: (peakGain - (skirtGain * k) / SHELF_Q + k * k) / a0,
    a1: (2 * (k * k - 1)) / a0,
    a2: (1 - k / SHELF_Q + k * k) / a0,
  };
}

function highPass(sampleRate: number): Biquad {
  const k = prewarped(HIGH_PASS_FREQUENCY_HZ, sampleRate);
  const a0 = 1 + k / HIGH_PASS_Q + k * k;
  return {
    b0: 1 / a0,
    b1: -2 / a0,
    b2: 1 / a0,
    a1: (2 * (k * k - 1)) / a0,
    a2: (1 - k / HIGH_PASS_Q + k * k) / a0,
  };
}

/** Direct-form-1 biquad, one pass, into a freshly allocated output (the input stays intact). */
function applyBiquad(samples: Float32Array, stage: Biquad): Float32Array {
  const out = new Float32Array(samples.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let n = 0; n < samples.length; n += 1) {
    const x0 = samples[n] as number;
    const y0 = stage.b0 * x0 + stage.b1 * x1 + stage.b2 * x2 - stage.a1 * y1 - stage.a2 * y2;
    out[n] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

/** The K-weighted signal: the shelf stage then the RLB high-pass, cascaded. */
export function applyKWeighting(samples: Float32Array, sampleRate: number): Float32Array {
  return applyBiquad(applyBiquad(samples, highShelf(sampleRate)), highPass(sampleRate));
}
