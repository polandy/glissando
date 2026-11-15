import { describe, expect, it } from "vitest";
import { pairsComingApart } from "./pairs-coming-apart";
import type { SlideUnit } from "./slide-units";

const single = (index: number): SlideUnit => ({ pictureIndices: [index] });
const pair = (first: number, second: number): SlideUnit => ({ pictureIndices: [first, second] });

describe("pairsComingApart", () => {
  it.each([
    {
      name: "a later pair that loses a picture comes apart",
      // Pictures 3 (alone) | 4+5 → 3+4 | 5.
      before: [single(0), single(1), single(2), pair(3, 4)],
      after: [single(0), single(1), pair(2, 3), single(4)],
      expected: [[4, 5]],
    },
    {
      name: "no pair comes apart when the rejoined picture's partner was single",
      before: [single(0), single(1), pair(2, 3)],
      after: [pair(0, 1), pair(2, 3)],
      expected: [],
    },
    {
      name: "a chain names every pair that came apart, in play order",
      // 1 (alone) | 2+3 | 4+5 | 6 → 1+2 | 3+4 | 5+6.
      before: [single(0), pair(1, 2), pair(3, 4), single(5)],
      after: [pair(0, 1), pair(2, 3), pair(4, 5)],
      expected: [
        [2, 3],
        [4, 5],
      ],
    },
    {
      name: "a pair the change does not touch stays out",
      before: [pair(0, 1), single(2), pair(3, 4)],
      after: [pair(0, 1), single(2), pair(3, 4)],
      expected: [],
    },
  ])("$name", ({ before, after, expected }) => {
    expect(pairsComingApart(before, after)).toEqual(expected);
  });
});
