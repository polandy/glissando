/**
 * `MusicLoudness` as JSON (dev-docs/library/MUSIC.md "Loudness levelling and song volume"): the
 * server and a device both read it from storage they do not fully trust, so both go through this
 * one check. Block loudness is dB (10·log10 of the mean square) and hop peaks are dBFS
 * (20·log10 of the peak), each rounded to 0.01 so the wire format stays compact; JSON has no
 * -Infinity, so silence (a zero mean square or peak) is `null`.
 */
import { LOUDNESS_BLOCK_MS, LOUDNESS_HOP_MS, type MusicLoudness } from "./measure-loudness";

/** A gating block spans this many hops; ties the two arrays' lengths together. */
const HOPS_PER_BLOCK = LOUDNESS_BLOCK_MS / LOUDNESS_HOP_MS;
const DECIBEL_ROUNDING_STEPS_PER_UNIT = 100;

const KNOWN_KEYS: ReadonlySet<string> = new Set(["blockLoudnessDb", "hopPeaksDbfs"]);

function roundedDecibels(value: number): number {
  return Math.round(value * DECIBEL_ROUNDING_STEPS_PER_UNIT) / DECIBEL_ROUNDING_STEPS_PER_UNIT;
}

export function musicLoudnessToJson(loudness: MusicLoudness): unknown {
  return {
    blockLoudnessDb: Array.from(loudness.blockMeanSquares, (meanSquare) =>
      meanSquare > 0 ? roundedDecibels(10 * Math.log10(meanSquare)) : null,
    ),
    hopPeaksDbfs: Array.from(loudness.hopPeaks, (peak) =>
      peak > 0 ? roundedDecibels(20 * Math.log10(peak)) : null,
    ),
  };
}

/**
 * The boundary check of a `MusicLoudness` read from JSON. Throws with the exact field and value
 * at fault: unknown keys, a field that is not an array, an entry that is not a finite number or
 * `null`, or a block count that does not match the hop count's gating relationship.
 */
export function parseMusicLoudness(json: unknown): MusicLoudness {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error(`MusicLoudness must be an object, got ${JSON.stringify(json)}`);
  }
  const unknownKey = Object.keys(json).find((key) => !KNOWN_KEYS.has(key));
  if (unknownKey !== undefined) {
    throw new Error(`MusicLoudness has no field "${unknownKey}"; remove it`);
  }

  const { blockLoudnessDb, hopPeaksDbfs } = json as Record<string, unknown>;
  const blockMeanSquares = decibelsToLinear(blockLoudnessDb, "blockLoudnessDb", (db) => 10 ** (db / 10));
  const hopPeaks = decibelsToLinear(hopPeaksDbfs, "hopPeaksDbfs", (dbfs) => 10 ** (dbfs / 20));

  const expectedBlocks = Math.max(0, hopPeaks.length - HOPS_PER_BLOCK + 1);
  if (blockMeanSquares.length !== expectedBlocks) {
    throw new Error(
      `MusicLoudness has ${String(blockMeanSquares.length)} "blockLoudnessDb" entries for ` +
        `${String(hopPeaks.length)} "hopPeaksDbfs" entries; a ${String(LOUDNESS_BLOCK_MS)} ms block ` +
        `every ${String(LOUDNESS_HOP_MS)} ms hop expects ${String(expectedBlocks)} blocks`,
    );
  }

  return {
    blockMeanSquares: Float32Array.from(blockMeanSquares),
    hopPeaks: Float32Array.from(hopPeaks),
  };
}

function decibelsToLinear(
  value: unknown,
  field: string,
  toLinear: (decibels: number) => number,
): number[] {
  if (!Array.isArray(value)) {
    throw new Error(`MusicLoudness's "${field}" must be an array, got ${JSON.stringify(value)}`);
  }
  return value.map((entry, index) => {
    if (entry === null) return 0;
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      throw new Error(
        `MusicLoudness's "${field}[${String(index)}]" must be a finite number or null, got ${JSON.stringify(entry)}`,
      );
    }
    return toLinear(entry);
  });
}
