import { describe, expect, it } from "vitest";
import { tappedFrame } from "./frame-hit";

/** Start top left, end bottom right, overlapping in the middle. */
const APART = {
  from: { x: 0.1, y: 0.1, width: 0.4, height: 0.3 },
  to: { x: 0.4, y: 0.3, width: 0.5, height: 0.5 },
};
/** The end frame inside the start frame, its border 0.1 in from the start frame's. */
const NESTED = {
  from: { x: 0, y: 0, width: 1, height: 1 },
  to: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
};
/** A finger's tolerance as a share of the picture: 0.02 of its width and of its height. */
const TOLERANCE = { x: 0.02, y: 0.02 };

describe("tappedFrame, with the start frame active", () => {
  it.each([
    ["deep inside the inactive frame only", "to", APART, { x: 0.8, y: 0.7 }],
    ["deep inside the active frame only", null, APART, { x: 0.2, y: 0.2 }],
    ["deep inside both, where they overlap", null, APART, { x: 0.45, y: 0.35 }],
    ["far outside both", null, APART, { x: 0.05, y: 0.9 }],
    ["in the overlap, near the inactive frame's border only", "to", APART, { x: 0.41, y: 0.37 }],
    ["in the overlap, near the active frame's border only", "from", APART, { x: 0.45, y: 0.39 }],
    ["near both borders at once", null, APART, { x: 0.41, y: 0.39 }],
    ["outside both, just beside the inactive frame's border", "to", APART, { x: 0.91, y: 0.5 }],
    ["nested, inside both near the inner frame's border", "to", NESTED, { x: 0.11, y: 0.5 }],
    ["nested, deep inside the inner frame", null, NESTED, { x: 0.5, y: 0.5 }],
    ["nested, between the borders", null, NESTED, { x: 0.05, y: 0.5 }],
  ] as const)("a tap %s picks %s", (_, expected, rects, point) => {
    expect(tappedFrame(point, rects, "from", TOLERANCE)).toBe(expected);
  });

  it("measures the tolerance per axis, as the picture's width and height differ", () => {
    const point = { x: 0.93, y: 0.5 };

    expect(tappedFrame(point, APART, "from", { x: 0.05, y: 0.02 })).toBe("to");
    expect(tappedFrame(point, APART, "from", { x: 0.02, y: 0.05 })).toBeNull();
  });
});
