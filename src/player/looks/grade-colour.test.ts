import { describe, expect, it } from "vitest";
import { gradeColour, type Rgb } from "./grade-colour";
import { LOOK_GRADES } from "./look-grades";

const CLOSE = 6;

describe("gradeColour: none", () => {
  it.each<[string, Rgb]>([
    ["black", [0, 0, 0]],
    ["white", [1, 1, 1]],
    ["an arbitrary colour", [0.5, 0.25, 0.9]],
  ])("is the identity on %s", (_label, rgb) => {
    expect(gradeColour("none", rgb)).toEqual(rgb);
  });
});

describe("gradeColour: warm", () => {
  // Matrix row R: 1.08 0.02 0, offset 0.015 — matrix(1,0,0) = 1.08*1+0.015 = 1.095, clamped to 1.
  // Row G: 0.01 1.01 0, offset 0.008 — matrix(1,0,0) = 0.01+0.008 = 0.018.
  // Row B: 0 0 0.86, offset 0 — matrix(1,0,0) = 0.
  // Curve R at c=1 (last knot) = 1; curve G at c=0.018 (< knot 1 at 0.25): knots 0,.25 -> linear
  // between 0 and .25: out = v0 + (c*4-0)*(v1-v0) = 0 + 0.072*0.25 = 0.018.
  // Curve B at c=0 (first knot) = 0.
  it("grades pure red", () => {
    const [r, g, b] = gradeColour("warm", [1, 0, 0]);
    expect(r).toBeCloseTo(1, CLOSE);
    expect(g).toBeCloseTo(0.018, CLOSE);
    expect(b).toBeCloseTo(0, CLOSE);
  });

  it("is the identity at the 0 and 1 knots for black and white", () => {
    expect(gradeColour("warm", [0, 0, 0])[2]).toBeCloseTo(0, CLOSE);
  });
});

describe("gradeColour: black-and-white", () => {
  const LUMA_R = 0.2126;
  const LUMA_G = 0.7152;
  const LUMA_B = 0.0722;

  it("turns red, green and blue into the same grey matrix value, then its own curve", () => {
    // Every row is the luma weights, so matrix(1,0,0) = LUMA_R for every output channel.
    const curve = LOOK_GRADES["black-and-white"].curve.r;
    const expectedGrey = curveAt(curve, LUMA_R);
    const [r, g, b] = gradeColour("black-and-white", [1, 0, 0]);
    expect(r).toBeCloseTo(expectedGrey, CLOSE);
    expect(g).toBeCloseTo(expectedGrey, CLOSE);
    expect(b).toBeCloseTo(expectedGrey, CLOSE);
  });

  it("grades white to the top knot (1)", () => {
    const grey = LUMA_R + LUMA_G + LUMA_B; // 1, clamped
    expect(grey).toBeCloseTo(1, CLOSE);
    const [r] = gradeColour("black-and-white", [1, 1, 1]);
    expect(r).toBeCloseTo(1, CLOSE);
  });
});

describe("gradeColour: clamping", () => {
  it("clamps a matrix result above 1 before the curve reads it", () => {
    // warm's R row on white: 1.08+0.02+0+0.015 = 1.115, clamped to 1 -> curve's top knot, 1.
    const [r] = gradeColour("warm", [1, 1, 1]);
    expect(r).toBeCloseTo(1, CLOSE);
  });
});

describe("gradeColour: between-knot interpolation", () => {
  it("interpolates linearly between a curve's fourth and fifth knot", () => {
    // film's matrix is S(0.82); its R row on pure red is (1-0.82)*LUMA_R + 0.82 = 0.858268.
    const matrixed = (1 - 0.82) * 0.2126 + 0.82;
    const position = matrixed * 4;
    const segment = Math.min(Math.floor(position), 3); // 3
    // film's curve R: .05 .2 .5 .82 .97 — the last two knots.
    const expected = 0.82 + (position - 3) * (0.97 - 0.82);
    expect(segment).toBe(3);
    const [r] = gradeColour("film", [1, 0, 0]);
    expect(r).toBeCloseTo(expected, CLOSE);
  });
});

function curveAt(knots: readonly [number, number, number, number, number], c: number): number {
  const [v0, v1, v2, v3, v4] = knots;
  const values = [v0, v1, v2, v3, v4];
  const position = c * 4;
  const segment = Math.min(Math.floor(position), 3);
  const from = values[segment] as number;
  const to = values[segment + 1] as number;
  return from + (position - segment) * (to - from);
}
