import { ABSOLUTE_GATE_LUFS, LOUDNESS_HOP_MS, lufsOf, type MusicLoudness } from "../../loudness";

/** How far back and forward a lift's before/after loudness is measured (ADR-0046, "Lifts"). */
const LIFT_WINDOW_MS = 4000;
/** The rise from before to after a lift must be at least this many LU. */
const LIFT_RISE_LU = 6;
/** Two lifts of the same song are at least this far apart. */
const LIFT_MIN_GAP_MS = 20_000;

interface RiseAt {
  readonly atMs: number;
  readonly riseLu: number;
  readonly afterLufs: number;
}

/**
 * Where the song's excerpt jumps into a loud passage (ADR-0046, "Lifts"), in excerpt-relative ms,
 * ascending: `t` where the loudness of the next `LIFT_WINDOW_MS` is at least `LIFT_RISE_LU` above
 * the previous `LIFT_WINDOW_MS`, at or above the excerpt's own `integratedLufs`, and a local
 * maximum of the rise. Each lift then moves to the nearest of `beatsMs` (also excerpt-relative),
 * when given.
 */
export function songLiftsMs(
  loudness: MusicLoudness,
  integratedLufs: number,
  excerptStartMs: number,
  excerptEndMs: number,
  beatsMs?: readonly number[],
): number[] {
  const rises = risesOver(loudness, excerptStartMs, excerptEndMs);
  const candidates = localMaxima(rises).filter(
    (rise) => rise.riseLu >= LIFT_RISE_LU && rise.afterLufs >= integratedLufs,
  );
  const acceptedMs = strongestFirst(candidates)
    .filter((candidate, _, accepted) => farEnoughFromEarlierAccepted(candidate, accepted))
    .map((candidate) => candidate.atMs)
    .sort((a, b) => a - b);
  return beatsMs === undefined ? acceptedMs : acceptedMs.map((atMs) => nearestOf(beatsMs, atMs));
}

/** The rise at every sampled moment a lift could sit at, `LOUDNESS_HOP_MS` apart. */
function risesOver(loudness: MusicLoudness, excerptStartMs: number, excerptEndMs: number): RiseAt[] {
  const lengthMs = excerptEndMs - excerptStartMs;
  const rises: RiseAt[] = [];
  for (let atMs = LIFT_WINDOW_MS; atMs <= lengthMs - LIFT_WINDOW_MS; atMs += LOUDNESS_HOP_MS) {
    const trackMs = excerptStartMs + atMs;
    const beforeLufs = meanLoudnessLufs(loudness, trackMs - LIFT_WINDOW_MS, trackMs);
    const afterLufs = meanLoudnessLufs(loudness, trackMs, trackMs + LIFT_WINDOW_MS);
    rises.push({ atMs, riseLu: afterLufs - beforeLufs, afterLufs });
  }
  return rises;
}

/** The rises that are a local maximum of this dense, `LOUDNESS_HOP_MS`-spaced sequence, the earliest of equal values winning. */
function localMaxima(rises: readonly RiseAt[]): RiseAt[] {
  return rises.filter((rise, index) => {
    const previous = rises[index - 1];
    const next = rises[index + 1];
    const risesFromBefore = previous === undefined || rise.riseLu > previous.riseLu;
    const doesNotRiseToNext = next === undefined || rise.riseLu >= next.riseLu;
    return risesFromBefore && doesNotRiseToNext;
  });
}

function strongestFirst(candidates: readonly RiseAt[]): RiseAt[] {
  return [...candidates].sort((a, b) => b.riseLu - a.riseLu || a.atMs - b.atMs);
}

function farEnoughFromEarlierAccepted(candidate: RiseAt, ranked: readonly RiseAt[]): boolean {
  const strongerOrEarlier = ranked.slice(0, ranked.indexOf(candidate));
  return strongerOrEarlier.every((accepted) => Math.abs(accepted.atMs - candidate.atMs) >= LIFT_MIN_GAP_MS);
}

function meanLoudnessLufs(loudness: MusicLoudness, fromMs: number, toMs: number): number {
  const meanSquares: number[] = [];
  for (let block = 0; block < loudness.blockMeanSquares.length; block += 1) {
    const blockStartMs = block * LOUDNESS_HOP_MS;
    if (blockStartMs >= fromMs && blockStartMs < toMs) {
      meanSquares.push(loudness.blockMeanSquares[block] as number);
    }
  }
  if (meanSquares.length === 0) {
    return ABSOLUTE_GATE_LUFS;
  }
  const meanSquare = meanSquares.reduce((sum, value) => sum + value, 0) / meanSquares.length;
  return Math.max(ABSOLUTE_GATE_LUFS, lufsOf(meanSquare));
}

function nearestOf(values: readonly number[], target: number): number {
  if (values.length === 0) {
    return target;
  }
  return values.reduce((nearest, value) =>
    Math.abs(value - target) < Math.abs(nearest - target) ? value : nearest,
  );
}
