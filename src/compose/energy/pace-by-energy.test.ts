import { describe, expect, it } from "vitest";
import type { PlaylistEnergy } from "./playlist-energy";
import { ENERGY_PASSES, paceByEnergy } from "./pace-by-energy";

const MIN_SLIDE_MS = 200;

/** A `PlaylistEnergy` stub whose energy steps from `quiet` to `loud` at `thresholdMs`. */
function stepEnergy(
  thresholdMs: number,
  quiet: number,
  loud: number,
): PlaylistEnergy & { calls: number } {
  let calls = 0;
  return {
    energyAt: () => quiet,
    meanEnergy: (fromMs) => {
      calls += 1;
      return fromMs < thresholdMs ? quiet : loud;
    },
    liftsMs: [],
    get calls() {
      return calls;
    },
  };
}

/** A `PlaylistEnergy` stub whose `meanEnergy` cycles through `energies` by call order. */
function indexedEnergy(energies: readonly number[]): PlaylistEnergy {
  let calls = 0;
  return {
    energyAt: () => 0.5,
    meanEnergy: () => {
      const value = energies[calls % energies.length] as number;
      calls += 1;
      return value;
    },
    liftsMs: [],
  };
}

describe("paceByEnergy", () => {
  it("stretches a slide in the quiet span and compresses one in the loud span, keeping the total", () => {
    const usualMs = [1000, 1000];
    const automatic = [true, true];
    const energy = stepEnergy(1000, 0, 1);

    const result = paceByEnergy(usualMs, automatic, energy, MIN_SLIDE_MS);

    expect(result).toEqual([1600, 400]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(2000);
  });

  it("runs exactly ENERGY_PASSES passes", () => {
    const usualMs = [1000, 1000];
    const automatic = [true, true];
    const energy = stepEnergy(1000, 0, 1);

    paceByEnergy(usualMs, automatic, energy, MIN_SLIDE_MS);

    expect(energy.calls).toBe(ENERGY_PASSES * 2);
  });

  it("falls back to the usual durations when the total cannot give every slide the minimum", () => {
    const usualMs = [1000, 1000];
    const automatic = [true, true];
    const energy = stepEnergy(1000, 0, 1);

    // 2 slides × 1100 ms minimum is more than the automatic total of 2000 ms: infeasible outright.
    const result = paceByEnergy(usualMs, automatic, energy, 1100);

    expect(result).toEqual(usualMs);
  });

  it("paces the other slides and keeps the total when one slide's natural share lands below the minimum", () => {
    // Plain energy weighting would give roughly [1378, 688, 34]; the last, short slide's share is
    // below MIN_SLIDE_MS. The previous, all-or-nothing fallback would have abandoned pacing
    // entirely here and returned the usual durations unweighted.
    const usualMs = [1000, 1000, 100];
    const automatic = [true, true, true];
    const energy = indexedEnergy([0, 0.5, 1]);

    const result = paceByEnergy(usualMs, automatic, energy, MIN_SLIDE_MS);

    expect(result).toEqual([1267, 633, 200]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(2100);
    expect(result.every((value) => value >= MIN_SLIDE_MS)).toBe(true);
  });

  it("keeps an own duration unchanged and out of the weighted share", () => {
    const usualMs = [500, 1000, 1000];
    const automatic = [false, true, true];
    const energy = stepEnergy(1500, 0, 1);

    const result = paceByEnergy(usualMs, automatic, energy, MIN_SLIDE_MS);

    expect(result[0]).toBe(500);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(2500);
  });

  it("leaves every slide at its usual duration where the energy is neutral throughout", () => {
    const usualMs = [800, 1200, 1000];
    const automatic = [true, true, true];
    const energy = stepEnergy(0, 0.5, 0.5);

    const result = paceByEnergy(usualMs, automatic, energy, MIN_SLIDE_MS);

    expect(result).toEqual(usualMs);
  });
});
