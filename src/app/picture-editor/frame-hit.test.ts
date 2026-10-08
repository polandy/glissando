import { describe, expect, it } from "vitest";
import { frameAt } from "./frame-hit";

const RECTS = {
  from: { x: 0.1, y: 0.1, width: 0.4, height: 0.3 },
  to: { x: 0.4, y: 0.3, width: 0.5, height: 0.5 },
};

describe("frameAt", () => {
  it.each([
    ["inside the start frame only", { x: 0.2, y: 0.2 }, "from"],
    ["inside the end frame only", { x: 0.8, y: 0.7 }, "to"],
    ["inside both, where they overlap", { x: 0.45, y: 0.35 }, "ambiguous"],
    ["outside both", { x: 0.05, y: 0.9 }, "none"],
    ["on the start frame's edge", { x: 0.1, y: 0.25 }, "from"],
  ] as const)("a point %s is %s", (_, point, expected) => {
    expect(frameAt(point, RECTS)).toBe(expected);
  });
});
