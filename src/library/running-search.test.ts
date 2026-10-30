import { describe, expect, it } from "vitest";
import type { SlideshowSearch } from "./focus-pass-types";
import { runningSearch } from "./running-search";

function search(done: number, total: number, again = false, failed = 0): SlideshowSearch {
  return { done, total, again, failed };
}

describe("runningSearch", () => {
  it("is null while no slideshow has pictures left to look at", () => {
    expect(runningSearch([new Map(), new Map([["done", search(5, 5, false, 2)]])])).toBeNull();
  });

  it("sums the slideshows still searched, over every pass, leaving finished ones out", () => {
    const device = new Map([
      ["summer", search(12, 40)],
      ["finished", search(9, 9)],
    ]);
    const server = new Map([["grandma", search(0, 25)]]);

    expect(runningSearch([device, server])).toEqual({ done: 12, total: 65, again: false });
  });

  it.each([
    { name: "every one searched again", again: [true, true], expected: true },
    { name: "one searched for the first time", again: [true, false], expected: false },
  ])("looks again only with $name", ({ again, expected }) => {
    const slideshows = new Map(again.map((value, index) => [`s${index}`, search(1, 4, value)]));

    expect(runningSearch([slideshows])?.again).toBe(expected);
  });
});
