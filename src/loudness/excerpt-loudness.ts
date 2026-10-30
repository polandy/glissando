/**
 * BS.1770-4 gated integrated loudness over the blocks that lie fully inside an excerpt
 * (dev-docs/library/MUSIC.md "Loudness levelling and song volume"): a quiet passage is excluded
 * outright (absolute gate), then anything far quieter than what is left is excluded too
 * (relative gate), so a few seconds of silence or a quiet bridge do not pull the number down.
 */
import { LOUDNESS_BLOCK_MS, LOUDNESS_HOP_MS, type MusicLoudness } from "./measure-loudness";

/** BS.1770-4's calibration offset from mean square to LUFS. */
const LUFS_CALIBRATION_OFFSET = -0.691;
/** A block quieter than this is gated out outright; also where silence floors (ADR-0046). */
export const ABSOLUTE_GATE_LUFS = -70;
/** A block more than this far below the absolute-gated mean is gated out too. */
const RELATIVE_GATE_LU = 10;

/** BS.1770-4's mean-square-to-LUFS conversion, reused wherever a block mean square needs it. */
export function lufsOf(meanSquare: number): number {
  return LUFS_CALIBRATION_OFFSET + 10 * Math.log10(meanSquare);
}

function meanOf(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** The mean squares of the blocks lying fully inside [startMs, endMs); reused for a 3 s window (ADR-0046). */
export function meanSquaresInside(m: MusicLoudness, startMs: number, endMs: number): number[] {
  const meanSquares: number[] = [];
  for (let block = 0; block < m.blockMeanSquares.length; block += 1) {
    const blockStartMs = block * LOUDNESS_HOP_MS;
    if (blockStartMs >= startMs && blockStartMs + LOUDNESS_BLOCK_MS <= endMs) {
      meanSquares.push(m.blockMeanSquares[block] as number);
    }
  }
  return meanSquares;
}

export function excerptLoudnessLufs(
  m: MusicLoudness,
  startMs: number,
  endMs: number,
): number | null {
  const meanSquares = meanSquaresInside(m, startMs, endMs);

  const aboveAbsoluteGate = meanSquares.filter((ms) => lufsOf(ms) >= ABSOLUTE_GATE_LUFS);
  if (aboveAbsoluteGate.length === 0) return null;

  const relativeThreshold = lufsOf(meanOf(aboveAbsoluteGate)) - RELATIVE_GATE_LU;
  const gated = aboveAbsoluteGate.filter((ms) => lufsOf(ms) >= relativeThreshold);
  if (gated.length === 0) return null;

  return lufsOf(meanOf(gated));
}
