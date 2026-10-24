import { describe, expect, it } from "vitest";
import { levelMs, syntheticLoudness } from "./testing/synthetic-loudness";
import { songLiftsMs } from "./lifts";

const QUIET_LUFS = -30;
const LOUD_LUFS = -12;
const INTEGRATED_LUFS = -20;

describe("songLiftsMs", () => {
  it("finds the jump from a quiet passage into a loud one", () => {
    const loudness = syntheticLoudness([
      ...levelMs(QUIET_LUFS, 15_000),
      ...levelMs(LOUD_LUFS, 15_000),
    ]);

    expect(songLiftsMs(loudness, INTEGRATED_LUFS, 0, 30_000)).toEqual([15_000]);
  });

  it("finds no lift where the rise is below LIFT_RISE_LU", () => {
    // Only 4 LU of rise, well above a low integrated loudness so that threshold cannot reject it.
    const loudness = syntheticLoudness([...levelMs(-25, 15_000), ...levelMs(-21, 15_000)]);

    expect(songLiftsMs(loudness, -30, 0, 30_000)).toEqual([]);
  });

  it("finds no lift where the louder passage is still below the excerpt's integrated loudness", () => {
    // A 10 LU rise, comfortably above LIFT_RISE_LU, but it still lands under the -20 LUFS integrated.
    const loudness = syntheticLoudness([...levelMs(-45, 15_000), ...levelMs(-35, 15_000)]);

    expect(songLiftsMs(loudness, INTEGRATED_LUFS, 0, 30_000)).toEqual([]);
  });

  it("finds no lift within LIFT_WINDOW_MS of the excerpt's start", () => {
    const loudness = syntheticLoudness([
      ...levelMs(QUIET_LUFS, 2000),
      ...levelMs(LOUD_LUFS, 28_000),
    ]);

    expect(songLiftsMs(loudness, INTEGRATED_LUFS, 0, 30_000)).toEqual([]);
  });

  it("keeps only the larger rise when two jumps are closer than LIFT_MIN_GAP_MS", () => {
    const loudness = syntheticLoudness([
      ...levelMs(QUIET_LUFS, 10_000),
      ...levelMs(-18, 8000), // the larger rise, 12 LU up from the quiet intro
      ...levelMs(-10, 12_000), // a smaller rise, 8 s later: only 6 LU up from -18
    ]);

    expect(songLiftsMs(loudness, INTEGRATED_LUFS, 0, 30_000)).toEqual([10_000]);
  });

  it("keeps both jumps once they are at least LIFT_MIN_GAP_MS apart", () => {
    const loudness = syntheticLoudness([
      ...levelMs(QUIET_LUFS, 10_000),
      ...levelMs(LOUD_LUFS, 20_000), // first jump at 10 s
      ...levelMs(QUIET_LUFS, 20_000), // back to quiet
      ...levelMs(LOUD_LUFS, 20_000), // second jump at 50 s, 40 s later
    ]);

    expect(songLiftsMs(loudness, INTEGRATED_LUFS, 0, 70_000)).toEqual([10_000, 50_000]);
  });

  it("moves a lift to the nearest beat of the song's excerpt when it has beats", () => {
    const loudness = syntheticLoudness([
      ...levelMs(QUIET_LUFS, 15_000),
      ...levelMs(LOUD_LUFS, 15_000),
    ]);

    expect(songLiftsMs(loudness, INTEGRATED_LUFS, 0, 30_000, [14_700, 15_400])).toEqual([14_700]);
  });

  it("leaves a lift where it is without any beats to snap to", () => {
    const loudness = syntheticLoudness([
      ...levelMs(QUIET_LUFS, 15_000),
      ...levelMs(LOUD_LUFS, 15_000),
    ]);

    expect(songLiftsMs(loudness, INTEGRATED_LUFS, 0, 30_000, [])).toEqual([15_000]);
  });
});
