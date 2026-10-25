import { LOUDNESS_HOP_MS, type MusicLoudness } from "../../loudness";
import { shortTermLoudnessLufs } from "./short-term-loudness";

/** A song with no measured energy, outside any song, or an "even" song: neither slower nor quicker. */
export const NEUTRAL_ENERGY = 0.5;

/** The percentile of a song's own short-term loudness that reads as fully quiet (energy 0). */
export const ENERGY_QUIET_PERCENTILE = 10;
/** The percentile a lift's "after" window must reach (ADR-0046, "Lifts"). */
export const LIFT_LEVEL_PERCENTILE = 50;
/** The percentile of a song's own short-term loudness that reads as fully loud (energy 1). */
export const ENERGY_LOUD_PERCENTILE = 90;
/** Below this many LU between the quiet and loud percentiles, a song has no audible dynamics. */
export const ENERGY_MIN_RANGE_LU = 2;

/** A song's own quiet, median and loud short-term loudness, in LUFS (ADR-0046, "Energy curve"). */
export interface SongEnergyRange {
  readonly quietLufs: number;
  readonly liftLevelLufs: number;
  readonly loudLufs: number;
}

/**
 * The song's own range, from `S` sampled every `LOUDNESS_HOP_MS` over the excerpt
 * (ADR-0046, "Energy curve"): the `ENERGY_QUIET_PERCENTILE`, `LIFT_LEVEL_PERCENTILE` and
 * `ENERGY_LOUD_PERCENTILE` of those samples. `null` when the song is flat: less than
 * `ENERGY_MIN_RANGE_LU` between its quiet and loud percentiles, so it has no audible dynamics.
 * Computed once per song; `songEnergyAt` is called a lot and must not resample.
 */
export function songEnergyRange(
  loudness: MusicLoudness,
  excerptStartMs: number,
  excerptEndMs: number,
): SongEnergyRange | null {
  const samples: number[] = [];
  for (let atMs = excerptStartMs; atMs < excerptEndMs; atMs += LOUDNESS_HOP_MS) {
    samples.push(shortTermLoudnessLufs(loudness, atMs, excerptStartMs, excerptEndMs));
  }
  if (samples.length === 0) {
    samples.push(shortTermLoudnessLufs(loudness, excerptStartMs, excerptStartMs, excerptEndMs));
  }
  const quietLufs = percentileOf(samples, ENERGY_QUIET_PERCENTILE);
  const liftLevelLufs = percentileOf(samples, LIFT_LEVEL_PERCENTILE);
  const loudLufs = percentileOf(samples, ENERGY_LOUD_PERCENTILE);
  if (loudLufs - quietLufs < ENERGY_MIN_RANGE_LU) {
    return null;
  }
  return { quietLufs, liftLevelLufs, loudLufs };
}

/**
 * How loud `atMs` of the track sounds within the song's own `range`, `0` (quiet) to `1` (loud):
 * the short-term loudness placed between the range's quiet and loud percentiles and clamped
 * (ADR-0046, "Energy curve"). `range` must not be flat; a flat song reads as `NEUTRAL_ENERGY`
 * before this is called (see `playlistEnergy`).
 */
export function songEnergyAt(
  loudness: MusicLoudness,
  range: SongEnergyRange,
  atMs: number,
  excerptStartMs: number,
  excerptEndMs: number,
): number {
  const shortTermLufs = shortTermLoudnessLufs(loudness, atMs, excerptStartMs, excerptEndMs);
  const raw = (shortTermLufs - range.quietLufs) / (range.loudLufs - range.quietLufs);
  return Math.min(1, Math.max(0, raw));
}

/** The linearly interpolated `percentile` (0..100) of `values`, nearest-rank between neighbours. */
function percentileOf(values: readonly number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (percentile / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const lower = sorted[lowerIndex] as number;
  const upper = sorted[upperIndex] as number;
  return lower + (upper - lower) * (rank - lowerIndex);
}
