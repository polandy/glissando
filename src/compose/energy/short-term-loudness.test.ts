import { describe, expect, it } from "vitest";
import { levelMs, syntheticLoudness } from "./testing/synthetic-loudness";
import { shortTermLoudnessLufs } from "./short-term-loudness";

const QUIET_LUFS = -30;
const LOUD_LUFS = -12;

describe("shortTermLoudnessLufs", () => {
  it("reads the level of a song held at one loudness throughout", () => {
    const loudness = syntheticLoudness(levelMs(QUIET_LUFS, 10_000));

    expect(shortTermLoudnessLufs(loudness, 5000, 0, 10_000)).toBeCloseTo(QUIET_LUFS, 5);
  });

  it("reads the louder level once the song has moved past the quiet intro", () => {
    const loudness = syntheticLoudness([...levelMs(QUIET_LUFS, 5000), ...levelMs(LOUD_LUFS, 5000)]);

    // Fully inside the loud half, 3 s away from the quiet/loud boundary.
    expect(shortTermLoudnessLufs(loudness, 8000, 0, 10_000)).toBeCloseTo(LOUD_LUFS, 5);
  });

  it("blends quiet and loud across the moment the song changes", () => {
    const loudness = syntheticLoudness([...levelMs(QUIET_LUFS, 5000), ...levelMs(LOUD_LUFS, 5000)]);

    const atTheChange = shortTermLoudnessLufs(loudness, 5000, 0, 10_000);

    expect(atTheChange).toBeGreaterThan(QUIET_LUFS);
    expect(atTheChange).toBeLessThan(LOUD_LUFS);
  });

  it("clips the window to the excerpt instead of reading blocks the excerpt trimmed away", () => {
    // A loud block just before the excerpt's start must not pull the reading up.
    const loudness = syntheticLoudness([...levelMs(LOUD_LUFS, 2000), ...levelMs(QUIET_LUFS, 8000)]);

    expect(shortTermLoudnessLufs(loudness, 2000, 2000, 10_000)).toBeCloseTo(QUIET_LUFS, 5);
  });

  it("floors a silent window at the absolute gate instead of returning -Infinity", () => {
    const loudness = syntheticLoudness(levelMs(-90, 10_000));

    expect(shortTermLoudnessLufs(loudness, 5000, 0, 10_000)).toBe(-70);
  });
});
