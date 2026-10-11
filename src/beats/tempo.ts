/** The slowest and fastest tempo the detector considers (ADR-0021). */
export const MIN_BEATS_PER_MINUTE = 50;
export const MAX_BEATS_PER_MINUTE = 200;
/** The tempo preferred among candidates that fit equally well. */
const PREFERRED_BEATS_PER_MINUTE = 120;
/** How wide the preference is, in octaves of tempo (standard deviation of a log-normal). */
const PREFERENCE_WIDTH_OCTAVES = 1;
/** How much the double and half period count toward a candidate. */
const HARMONIC_WEIGHT = 0.5;
const SECONDS_PER_MINUTE = 60;

export interface Tempo {
  /** The beat period in envelope frames, interpolated between whole frames. */
  readonly periodFrames: number;
  readonly beatsPerMinute: number;
  /**
   * How clearly the music pulses: the autocorrelation at the chosen period over its mean across
   * the tempo range. Not finite for silence.
   */
  readonly clarity: number;
}

/**
 * The tempo as the period at which the onset envelope correlates best with itself, its double
 * and half periods weighted in and a log-normal preference around 120 BPM breaking near-ties.
 */
export function estimateTempo(strengths: Float32Array, framesPerSecond: number): Tempo {
  const framesPerMinute = framesPerSecond * SECONDS_PER_MINUTE;
  const minLag = Math.floor(framesPerMinute / MAX_BEATS_PER_MINUTE);
  const maxLag = Math.ceil(framesPerMinute / MIN_BEATS_PER_MINUTE);
  // Twice the longest lag, for its double period.
  const correlation = autocorrelation(strengths, 2 * maxLag + 1);
  const correlationAt = (lag: number) => interpolated(correlation, lag);

  let bestLag = minLag;
  let bestScore = -Infinity;
  let correlationSum = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    const ownCorrelation = correlationAt(lag);
    const score =
      (ownCorrelation + HARMONIC_WEIGHT * (correlationAt(lag * 2) + correlationAt(lag / 2))) *
      tempoPreference(framesPerMinute / lag);
    correlationSum += ownCorrelation;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  const periodFrames = bestLag + peakShift(correlation, bestLag);
  const meanCorrelation = correlationSum / (maxLag - minLag + 1);
  return {
    periodFrames,
    beatsPerMinute: framesPerMinute / periodFrames,
    clarity: correlationAt(bestLag) / meanCorrelation,
  };
}

/** The mean product of the envelope with itself shifted by each lag from 0 to `maxLag`. */
function autocorrelation(strengths: Float32Array, maxLag: number): Float64Array {
  const correlation = new Float64Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag && lag < strengths.length; lag += 1) {
    let sum = 0;
    for (let index = lag; index < strengths.length; index += 1) {
      sum += (strengths[index] ?? 0) * (strengths[index - lag] ?? 0);
    }
    correlation[lag] = sum / (strengths.length - lag);
  }
  return correlation;
}

/** The value at a fractional index, linear between its neighbours; 0 beyond the end. */
function interpolated(values: Float64Array, index: number): number {
  const whole = Math.floor(index);
  const fraction = index - whole;
  if (whole + 1 >= values.length) {
    return 0;
  }
  return (values[whole] ?? 0) * (1 - fraction) + (values[whole + 1] ?? 0) * fraction;
}

function tempoPreference(beatsPerMinute: number): number {
  const octavesAway = Math.log2(beatsPerMinute / PREFERRED_BEATS_PER_MINUTE);
  return Math.exp(-0.5 * (octavesAway / PREFERENCE_WIDTH_OCTAVES) ** 2);
}

/** Where the true peak lies off the whole lag, by a parabola through it and its neighbours. */
function peakShift(values: Float64Array, lag: number): number {
  const before = values[lag - 1] ?? 0;
  const peak = values[lag] ?? 0;
  const after = values[lag + 1] ?? 0;
  const shift = (before - after) / (2 * (before - 2 * peak + after));
  const halfFrame = 0.5;
  return Number.isFinite(shift) ? Math.max(-halfFrame, Math.min(halfFrame, shift)) : 0;
}
