import { describe, expect, it } from "vitest";
import { levelMs, syntheticLoudness } from "./testing/synthetic-loudness";
import { NEUTRAL_ENERGY, songEnergyAt } from "./energy-curve";

describe("songEnergyAt", () => {
  it("reads neutral energy where the short-term loudness matches the excerpt's integrated loudness", () => {
    const loudness = syntheticLoudness(levelMs(-20, 10_000));

    expect(songEnergyAt(loudness, -20, 5000, 0, 10_000)).toBeCloseTo(NEUTRAL_ENERGY, 5);
  });

  it("reads above neutral where the moment is louder than the excerpt as a whole", () => {
    const loudness = syntheticLoudness([...levelMs(-30, 5000), ...levelMs(-12, 5000)]);

    expect(songEnergyAt(loudness, -21, 8000, 0, 10_000)).toBeGreaterThan(NEUTRAL_ENERGY);
  });

  it("reads below neutral where the moment is quieter than the excerpt as a whole", () => {
    const loudness = syntheticLoudness([...levelMs(-30, 5000), ...levelMs(-12, 5000)]);

    expect(songEnergyAt(loudness, -21, 1000, 0, 10_000)).toBeLessThan(NEUTRAL_ENERGY);
  });

  it("clamps at 1 for a moment far louder than the excerpt's integrated loudness", () => {
    const loudness = syntheticLoudness(levelMs(0, 10_000));

    expect(songEnergyAt(loudness, -70, 5000, 0, 10_000)).toBe(1);
  });

  it("clamps at 0 for a moment far quieter than the excerpt's integrated loudness", () => {
    const loudness = syntheticLoudness(levelMs(-90, 10_000));

    expect(songEnergyAt(loudness, 0, 5000, 0, 10_000)).toBe(0);
  });
});
