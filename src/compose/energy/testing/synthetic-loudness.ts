/**
 * Synthetic `MusicLoudness` for energy-pacing tests, built directly from LUFS levels instead of a
 * decoded recording. Never a real measurement — see CLAUDE.md memory on real media in tests.
 */
import { LOUDNESS_HOP_MS, lufsOf, type MusicLoudness } from "../../../loudness";

/** The mean square whose LUFS, by `lufsOf`'s calibration, is `lufs`. */
function meanSquareOfLufs(lufs: number): number {
  return 10 ** ((lufs - lufsOf(1)) / 10);
}

/** `lufs` held for `durationMs`, one level per 100 ms hop (`LOUDNESS_HOP_MS`). */
export function levelMs(lufs: number, durationMs: number): number[] {
  return new Array(durationMs / LOUDNESS_HOP_MS).fill(lufs);
}

/** A `MusicLoudness` whose block `i` sits at `lufsLevels[i]`, one block per hop. */
export function syntheticLoudness(lufsLevels: readonly number[]): MusicLoudness {
  return {
    blockMeanSquares: Float32Array.from(lufsLevels.map(meanSquareOfLufs)),
    hopPeaks: new Float32Array(lufsLevels.length),
  };
}
