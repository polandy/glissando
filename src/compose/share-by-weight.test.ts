import { describe, expect, it } from "vitest";
import { shareByWeightMs, shareByWeightWithMinimumMs } from "./share-by-weight";

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

describe("shareByWeightWithMinimumMs", () => {
  it("matches the plain share when nothing would fall below the minimum", () => {
    expect(shareByWeightWithMinimumMs([1, 3], 400, 50)).toEqual([100, 300]);
  });

  it("raises a share that would fall below the minimum, and re-shares the rest by weight", () => {
    // Plain shareByWeightMs would give [2, 33, 165]; the first share is below the minimum.
    const shares = shareByWeightWithMinimumMs([1, 20, 100], 200, 20);

    expect(shares).toEqual([20, 30, 150]);
    expect((shares as number[]).reduce((sum, share) => sum + share, 0)).toBe(200);
  });

  it("raises every share that is still below the minimum once the rest is re-shared", () => {
    // Plain shareByWeightMs would give [1, 9, 90]: the first two both start below the minimum,
    // and re-sharing the remainder among the rest leaves the second one below it again.
    const shares = shareByWeightWithMinimumMs([1, 9, 90], 100, 10);

    expect(shares).toEqual([10, 10, 80]);
    expect((shares as number[]).reduce((sum, share) => sum + share, 0)).toBe(100);
  });

  it("never lets a raised share, or the shares around it, fall below the minimum", () => {
    const shares = shareByWeightWithMinimumMs([1, 9, 90], 100, 10) as number[];

    expect(shares.every((share) => share >= 10)).toBe(true);
  });

  it("returns null when the total cannot give every weight the minimum at all", () => {
    expect(shareByWeightWithMinimumMs([1, 1], 100, 60)).toBeNull();
  });
});
