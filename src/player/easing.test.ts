import { describe, expect, it } from "vitest";
import { ease } from "./easing";
import { EASINGS } from "./slideshow";

describe("ease", () => {
  it.each(EASINGS)("%s starts at 0 and ends at 1", (easing) => {
    expect(ease(easing, 0)).toBe(0);
    expect(ease(easing, 1)).toBe(1);
  });

  it.each([
    ["linear", 0.25, 0.25],
    ["ease-in", 0.5, 0.125],
    ["ease-out", 0.5, 0.875],
    ["ease-in-out", 0.25, 0.0625],
    ["ease-in-out", 0.5, 0.5],
    ["ease-in-out", 0.75, 0.9375],
  ] as const)("%s at %d is %d", (easing, progress, expected) => {
    expect(ease(easing, progress)).toBeCloseTo(expected, 10);
  });

  it("clamps progress outside 0..1", () => {
    expect(ease("ease-in", -0.5)).toBe(0);
    expect(ease("ease-out", 1.5)).toBe(1);
  });
});
