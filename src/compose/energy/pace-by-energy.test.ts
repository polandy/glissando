import { describe, expect, it } from "vitest";
import type { PlaylistEnergy } from "./playlist-energy";
import { ENERGY_PASSES, paceByEnergy } from "./pace-by-energy";

const MIN_SLIDE_MS = 200;

/** A `PlaylistEnergy` stub whose energy steps from `quiet` to `loud` at `thresholdMs`. */
function stepEnergy(thresholdMs: number, quiet: number, loud: number): PlaylistEnergy & { calls: number } {
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

describe("paceByEnergy", () => {
  it("stretches a slide in the quiet span and compresses one in the loud span, keeping the total", () => {
    const usualMs = [1000, 1000];
    const automatic = [true, true];
    const energy = stepEnergy(1000, 0, 1);

    const result = paceByEnergy(usualMs, automatic, energy, MIN_SLIDE_MS);

    expect(result).toEqual([1385, 615]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(2000);
  });

  it("runs exactly ENERGY_PASSES passes", () => {
    const usualMs = [1000, 1000];
    const automatic = [true, true];
    const energy = stepEnergy(1000, 0, 1);

    paceByEnergy(usualMs, automatic, energy, MIN_SLIDE_MS);

    expect(energy.calls).toBe(ENERGY_PASSES * 2);
  });

  it("falls back to the usual durations when a share would land below the minimum", () => {
    const usualMs = [1000, 1000];
    const automatic = [true, true];
    const energy = stepEnergy(1000, 0, 1);

    const result = paceByEnergy(usualMs, automatic, energy, 700);

    expect(result).toEqual(usualMs);
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
