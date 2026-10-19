import { describe, expect, it } from "vitest";
import { decibelsToGain, type MusicLoudness } from "../loudness";
import { trackGain } from "./track-gain";

/** BS.1770-4's calibration offset from mean square to LUFS (matches excerpt-loudness.ts). */
const LUFS_CALIBRATION_OFFSET = -0.691;

function meanSquareOf(lufs: number): number {
  return 10 ** ((lufs - LUFS_CALIBRATION_OFFSET) / 10);
}

/** One 400 ms block, one 100 ms hop: just enough for a 0..100 ms excerpt to measure. */
function loudnessOf(lufs: number, peak: number): MusicLoudness {
  return {
    blockMeanSquares: new Float32Array([meanSquareOf(lufs)]),
    hopPeaks: new Float32Array([peak, peak, peak, peak]),
  };
}

describe("trackGain", () => {
  it("levels a quiet excerpt louder, towards the target loudness", () => {
    const loudness = loudnessOf(-20, 0);
    const gain = trackGain({ loudness, startMs: 0, endMs: 400, ownDb: 0 });
    expect(gain).toBeCloseTo(decibelsToGain(6), 5);
  });

  it("adds the song's own volume on top of the levelling", () => {
    const loudness = loudnessOf(-14, 0);
    const gain = trackGain({ loudness, startMs: 0, endMs: 400, ownDb: -6 });
    expect(gain).toBeCloseTo(decibelsToGain(-6), 5);
  });

  it("never pushes the excerpt's peak past the ceiling", () => {
    const loudness = loudnessOf(-14, 0.5);
    const gain = trackGain({ loudness, startMs: 0, endMs: 400, ownDb: 20 });
    const ceilingGainDb = -1 - 20 * Math.log10(0.5);
    expect(gain).toBeCloseTo(decibelsToGain(ceilingGainDb), 5);
    expect(gain).toBeLessThan(decibelsToGain(20));
  });

  it("plays at the song's own volume alone when its loudness is not measured yet", () => {
    const gain = trackGain({ loudness: undefined, startMs: 0, endMs: 400, ownDb: 3 });
    expect(gain).toBeCloseTo(decibelsToGain(3), 5);
  });
});
