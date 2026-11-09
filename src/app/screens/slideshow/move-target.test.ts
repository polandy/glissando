import { describe, expect, it } from "vitest";
import { clampPictureNumber, insertionFor, stepPictureNumber } from "./move-target";

describe("insertionFor", () => {
  it("counts Start as 0 and End as the order's length", () => {
    expect(insertionFor({ kind: "start" }, 12)).toBe(0);
    expect(insertionFor({ kind: "end" }, 12)).toBe(12);
  });

  it("counts Before picture N as N - 1, in the current order", () => {
    expect(insertionFor({ kind: "before", number: 1 }, 12)).toBe(0);
    expect(insertionFor({ kind: "before", number: 5 }, 12)).toBe(4);
    expect(insertionFor({ kind: "before", number: 12 }, 12)).toBe(11);
  });
});

describe("picture number", () => {
  it("clamps into 1 to the order's length", () => {
    expect(clampPictureNumber(0, 12)).toBe(1);
    expect(clampPictureNumber(13, 12)).toBe(12);
    expect(clampPictureNumber(7, 12)).toBe(7);
  });

  it("steps by one and stops at both ends", () => {
    expect(stepPictureNumber(5, 1, 12)).toBe(6);
    expect(stepPictureNumber(5, -1, 12)).toBe(4);
    expect(stepPictureNumber(1, -1, 12)).toBe(1);
    expect(stepPictureNumber(12, 1, 12)).toBe(12);
  });
});
