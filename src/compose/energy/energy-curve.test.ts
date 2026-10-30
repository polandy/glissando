import { describe, expect, it } from "vitest";
import { levelMs, syntheticLoudness } from "./testing/synthetic-loudness";
import {
  NEUTRAL_ENERGY,
  songEnergyAt,
  songEnergyRange,
  type SongEnergyRange,
} from "./energy-curve";

describe("songEnergyRange", () => {
  it("is null for a flat song, with less than ENERGY_MIN_RANGE_LU between its percentiles", () => {
    const loudness = syntheticLoudness(levelMs(-20, 10_000));

    expect(songEnergyRange(loudness, 0, 10_000)).toBeNull();
  });

  it("spans the full range for a song with only a few LU of quiet/loud swing", () => {
    // Mastered music swings only a few LU; here just above ENERGY_MIN_RANGE_LU (2).
    const loudness = syntheticLoudness([...levelMs(-22, 10_000), ...levelMs(-19, 10_000)]);

    const range = songEnergyRange(loudness, 0, 20_000);

    expect(range).not.toBeNull();
    expect(songEnergyAt(loudness, range as SongEnergyRange, 2000, 0, 20_000)).toBeCloseTo(0, 1);
    expect(songEnergyAt(loudness, range as SongEnergyRange, 18_000, 0, 20_000)).toBeCloseTo(1, 1);
  });
});

describe("songEnergyAt", () => {
  const range: SongEnergyRange = { quietLufs: -30, liftLevelLufs: -21, loudLufs: -12 };

  it("reads neutral energy at the midpoint between the range's quiet and loud percentiles", () => {
    const loudness = syntheticLoudness(levelMs(-21, 10_000));

    expect(songEnergyAt(loudness, range, 5000, 0, 10_000)).toBeCloseTo(NEUTRAL_ENERGY, 5);
  });

  it("reads above neutral where the moment is louder than the range's midpoint", () => {
    const loudness = syntheticLoudness([...levelMs(-30, 5000), ...levelMs(-12, 5000)]);

    expect(songEnergyAt(loudness, range, 8000, 0, 10_000)).toBeGreaterThan(NEUTRAL_ENERGY);
  });

  it("reads below neutral where the moment is quieter than the range's midpoint", () => {
    const loudness = syntheticLoudness([...levelMs(-30, 5000), ...levelMs(-12, 5000)]);

    expect(songEnergyAt(loudness, range, 1000, 0, 10_000)).toBeLessThan(NEUTRAL_ENERGY);
  });

  it("clamps at 1 for a moment louder than the range's loud percentile", () => {
    const loudness = syntheticLoudness(levelMs(0, 10_000));

    expect(songEnergyAt(loudness, range, 5000, 0, 10_000)).toBe(1);
  });

  it("clamps at 0 for a moment quieter than the range's quiet percentile", () => {
    const loudness = syntheticLoudness(levelMs(-90, 10_000));

    expect(songEnergyAt(loudness, range, 5000, 0, 10_000)).toBe(0);
  });
});
