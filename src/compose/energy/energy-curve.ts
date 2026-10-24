import type { MusicLoudness } from "../../loudness";
import { shortTermLoudnessLufs } from "./short-term-loudness";

/** A song with no measured energy, outside any song, or an "even" song: neither slower nor quicker. */
export const NEUTRAL_ENERGY = 0.5;

/** The LU either side of a song's own integrated loudness that map to the full 0..1 energy range. */
const ENERGY_RANGE_LU = 12;

/**
 * How loud `atMs` of the track sounds against the song's own excerpt, `0` (quiet) to `1` (loud):
 * the short-term loudness relative to the excerpt's integrated loudness `integratedLufs`, scaled
 * by `ENERGY_RANGE_LU` and clamped (ADR-0046, "Energy curve").
 */
export function songEnergyAt(
  loudness: MusicLoudness,
  integratedLufs: number,
  atMs: number,
  excerptStartMs: number,
  excerptEndMs: number,
): number {
  const shortTermLufs = shortTermLoudnessLufs(loudness, atMs, excerptStartMs, excerptEndMs);
  const raw = NEUTRAL_ENERGY + (shortTermLufs - integratedLufs) / ENERGY_RANGE_LU;
  return Math.min(1, Math.max(0, raw));
}
