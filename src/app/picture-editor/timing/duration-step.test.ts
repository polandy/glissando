import { describe, expect, it } from "vitest";
import { canStepDuration, stepDurationMs } from "./duration-step";

describe("stepDurationMs", () => {
  it.each([
    [5000, "longer", 5500],
    [5000, "shorter", 4500],
    [6286, "longer", 6500 + 500],
    [6286, "shorter", 6000],
    [6100, "longer", 6500],
    [15_000, "longer", 15_000],
    [2000, "shorter", 2000],
  ] as const)(
    "steps %i ms %s to %i ms: from the half-second grid, within 2 to 15 s",
    (from, direction, to) => {
      expect(stepDurationMs(from, direction)).toBe(to);
    },
  );
});

describe("canStepDuration", () => {
  it("is false only at the bounds", () => {
    expect(canStepDuration(15_000, "longer")).toBe(false);
    expect(canStepDuration(2000, "shorter")).toBe(false);
    expect(canStepDuration(14_800, "longer")).toBe(true);
    expect(canStepDuration(2200, "shorter")).toBe(true);
  });
});
