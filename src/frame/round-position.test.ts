import { describe, expect, it } from "vitest";
import { pictureIndexAt } from "./round-position";

describe("pictureIndexAt", () => {
  it.each([
    [0, 0],
    [29.9, 0],
    [30, 1],
    [75, 2],
  ])("is on picture %# at %f s with 30 s per picture", (seconds, index) => {
    expect(pictureIndexAt(seconds, 30_000, 4)).toBe(index);
  });

  it("stays on the last picture at the round's end", () => {
    expect(pictureIndexAt(120, 30_000, 4)).toBe(3);
  });
});
