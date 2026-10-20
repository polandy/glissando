/**
 * The loudest `lengthMs` window of an excerpt, by summed gating-block energy — used to start the
 * editor's "Listen" preview from the song's loudest part, not its first second.
 */
import { LOUDNESS_HOP_MS, type MusicLoudness } from "./measure-loudness";

export function loudestStretchStartMs(
  m: MusicLoudness,
  startMs: number,
  endMs: number,
  lengthMs: number,
): number {
  if (endMs - startMs <= lengthMs) return startMs;

  // Prefix sums over the blocks' starts let any candidate window's energy come from two lookups.
  const prefix = new Float64Array(m.blockMeanSquares.length + 1);
  for (let block = 0; block < m.blockMeanSquares.length; block += 1) {
    prefix[block + 1] = (prefix[block] as number) + (m.blockMeanSquares[block] as number);
  }
  const energyOfWindow = (windowStartMs: number): number => {
    const firstBlock = Math.min(
      Math.ceil(windowStartMs / LOUDNESS_HOP_MS),
      m.blockMeanSquares.length,
    );
    const lastBlock = Math.min(
      Math.ceil((windowStartMs + lengthMs) / LOUDNESS_HOP_MS),
      m.blockMeanSquares.length,
    );
    return (prefix[lastBlock] as number) - (prefix[firstBlock] as number);
  };

  const firstCandidateMs = Math.ceil(startMs / LOUDNESS_HOP_MS) * LOUDNESS_HOP_MS;
  const lastCandidateMs = endMs - lengthMs;

  let bestStartMs = startMs;
  let bestEnergy = -Infinity;
  for (
    let candidateMs = firstCandidateMs;
    candidateMs <= lastCandidateMs;
    candidateMs += LOUDNESS_HOP_MS
  ) {
    const energy = energyOfWindow(candidateMs);
    if (energy > bestEnergy) {
      bestEnergy = energy;
      bestStartMs = candidateMs;
    }
  }
  return bestStartMs;
}
