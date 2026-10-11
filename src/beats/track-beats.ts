/**
 * How strongly the tracking holds to the tempo: the penalty for a beat-to-beat interval that
 * strays from the period (Ellis 2007).
 */
const TEMPO_TIGHTNESS = 100;
/** The shortest and longest interval between two beats, in periods. */
const MIN_INTERVAL_PERIODS = 0.5;
const MAX_INTERVAL_PERIODS = 2;

/**
 * The beat frames along the onset envelope, by dynamic programming (Ellis 2007): each frame's
 * best chain of earlier beats, its intervals held near the period, so a tempo that drifts is
 * followed. Ascending.
 */
export function trackBeats(strengths: Float32Array, periodFrames: number): number[] {
  const count = strengths.length;
  const score = new Float64Array(count);
  const previousBeat = new Int32Array(count).fill(-1);
  const shortest = Math.round(periodFrames * MIN_INTERVAL_PERIODS);
  const longest = Math.round(periodFrames * MAX_INTERVAL_PERIODS);
  for (let frame = 0; frame < count; frame += 1) {
    let bestScore = 0;
    let bestFrom = -1;
    for (let from = Math.max(0, frame - longest); from <= frame - shortest; from += 1) {
      const candidate =
        (score[from] ?? 0) - TEMPO_TIGHTNESS * Math.log((frame - from) / periodFrames) ** 2;
      if (bestFrom < 0 || candidate > bestScore) {
        bestScore = candidate;
        bestFrom = from;
      }
    }
    // A chain worth less than nothing is not continued: the frame starts a chain of its own.
    const chained = bestFrom >= 0 && bestScore > 0;
    score[frame] = (strengths[frame] ?? 0) + (chained ? bestScore : 0);
    previousBeat[frame] = chained ? bestFrom : -1;
  }
  const beats: number[] = [];
  for (
    let frame = bestLastBeat(score, periodFrames);
    frame >= 0;
    frame = previousBeat[frame] ?? -1
  ) {
    beats.push(frame);
  }
  return beats.reverse();
}

/** The chain ends on the best-scoring frame within the last period. */
function bestLastBeat(score: Float64Array, periodFrames: number): number {
  let best = score.length - 1;
  for (
    let frame = Math.max(0, score.length - Math.round(periodFrames));
    frame < score.length;
    frame += 1
  ) {
    if ((score[frame] ?? 0) > (score[best] ?? 0)) {
      best = frame;
    }
  }
  return best;
}
