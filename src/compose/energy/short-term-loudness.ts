import { ABSOLUTE_GATE_LUFS, lufsOf, meanSquaresInside, type MusicLoudness } from "../../loudness";

/** The short-term loudness window spans 3 s, centred on the moment (ADR-0046). */
const SHORT_TERM_WINDOW_MS = 3000;

/**
 * How loud `atMs` of the track sounds over the surrounding `SHORT_TERM_WINDOW_MS`, clipped to the
 * excerpt `[excerptStartMs, excerptEndMs)`; floored at `ABSOLUTE_GATE_LUFS` so silence never reads
 * as `-Infinity` (ADR-0046, "Energy curve").
 */
export function shortTermLoudnessLufs(
  loudness: MusicLoudness,
  atMs: number,
  excerptStartMs: number,
  excerptEndMs: number,
): number {
  const halfWindowMs = SHORT_TERM_WINDOW_MS / 2;
  const fromMs = Math.max(excerptStartMs, atMs - halfWindowMs);
  const toMs = Math.min(excerptEndMs, atMs + halfWindowMs);
  const meanSquares = meanSquaresInside(loudness, fromMs, toMs);
  if (meanSquares.length === 0) {
    return ABSOLUTE_GATE_LUFS;
  }
  const meanSquare = meanSquares.reduce((sum, value) => sum + value, 0) / meanSquares.length;
  return Math.max(ABSOLUTE_GATE_LUFS, lufsOf(meanSquare));
}
