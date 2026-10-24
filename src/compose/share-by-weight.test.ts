import { describe, expect, it } from "vitest";
import { shareByWeightMs } from "./share-by-weight";

describe("shareByWeightMs", () => {
  it("shares a length evenly across equal weights", () => {
    expect(shareByWeightMs([1, 1, 1], 300)).toEqual([100, 100, 100]);
  });

  it("shares a length in proportion to unequal weights", () => {
    expect(shareByWeightMs([1, 3], 400)).toEqual([100, 300]);
  });

  it("gives the remainder of whole ms to the first slides so the sum matches exactly", () => {
    expect(shareByWeightMs([1, 1, 1], 100)).toEqual([34, 33, 33]);
  });

  it("returns nothing for no weights at all", () => {
    expect(shareByWeightMs([], 1000)).toEqual([]);
  });

  it("returns a share of 0 for a weight of 0 among others", () => {
    expect(shareByWeightMs([0, 1], 100)).toEqual([0, 100]);
  });
});
