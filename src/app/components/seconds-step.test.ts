import { describe, expect, it } from "vitest";
import { MAX_SECONDS_PER_PICTURE, MIN_SECONDS_PER_PICTURE } from "../../library/stored-slideshow";
import { canStep, stepSeconds } from "./seconds-step";

describe("seconds per picture stepper", () => {
  it.each([
    [5, "longer", 5.5],
    [5, "shorter", 4.5],
    [2.5, "shorter", 2],
    [14.5, "longer", 15],
    [4.7, "longer", 5],
    [4.7, "shorter", 4.5],
  ] as const)("steps %d %s to %d in half seconds", (seconds, direction, expected) => {
    expect(stepSeconds(seconds, direction)).toBe(expected);
  });

  it("never goes below the minimum or above the maximum", () => {
    expect(stepSeconds(MIN_SECONDS_PER_PICTURE, "shorter")).toBe(MIN_SECONDS_PER_PICTURE);
    expect(stepSeconds(MAX_SECONDS_PER_PICTURE, "longer")).toBe(MAX_SECONDS_PER_PICTURE);
  });

  it("disables shorter at the minimum and longer at the maximum only", () => {
    expect(canStep(MIN_SECONDS_PER_PICTURE, "longer")).toBe(true);
    expect(canStep(MIN_SECONDS_PER_PICTURE, "shorter")).toBe(false);
    expect(canStep(MAX_SECONDS_PER_PICTURE, "shorter")).toBe(true);
    expect(canStep(MAX_SECONDS_PER_PICTURE, "longer")).toBe(false);
    expect(canStep(5, "shorter")).toBe(true);
    expect(canStep(5, "longer")).toBe(true);
  });
});
