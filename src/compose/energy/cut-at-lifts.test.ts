import { describe, expect, it } from "vitest";
import { cutAtLifts } from "./cut-at-lifts";

const MIN_SLIDE_MS = 10;

describe("cutAtLifts", () => {
  it("moves the nearest boundary between two automatic slides onto a lift", () => {
    const durationsMs = [1000, 1000, 1000];
    const automatic = [true, true, true];

    const result = cutAtLifts(durationsMs, automatic, [900], MIN_SLIDE_MS);

    expect(result).toEqual([900, 1100, 1000]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(3000);
  });

  it("skips a lift when moving the nearest boundary would drop a slide below the minimum", () => {
    const durationsMs = [1000, 1000, 1000];
    const automatic = [true, true, true];

    const result = cutAtLifts(durationsMs, automatic, [900], 950);

    expect(result).toEqual(durationsMs);
  });

  it("never moves a boundary that touches an own duration, even when it sits closer to the lift", () => {
    const durationsMs = [1000, 1000, 1000, 1000];
    const automatic = [false, true, true, true];

    // 1050 sits only 50 ms from the forbidden boundary at 1000 (own | automatic), but 950 ms
    // from the nearest boundary between two automatic slides, at 2000.
    const result = cutAtLifts(durationsMs, automatic, [1050], MIN_SLIDE_MS);

    expect(result[0]).toBe(1000);
    expect(result).toEqual([1000, 50, 1950, 1000]);
  });

  it("keeps the total when a dedicated chapter slide plays right before the boundary's next slide", () => {
    const durationsMs = [1000, 1000, 1000];
    const automatic = [true, true, true];
    const chapterBeforeSecond = { beforeMs: [0, 500, 0], ownMs: [0, 0, 0] };

    const result = cutAtLifts(durationsMs, automatic, [900], MIN_SLIDE_MS, chapterBeforeSecond);

    expect(result).toEqual([900, 1100, 1000]);
  });

  it("applies lifts one after another, each onto the boundaries left by the one before", () => {
    const durationsMs = [1000, 1000, 1000];
    const automatic = [true, true, true];

    const result = cutAtLifts(durationsMs, automatic, [850, 950], MIN_SLIDE_MS);

    expect(result).toEqual([950, 1050, 1000]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(3000);
  });

  it("picks each lift's nearest boundary afresh, after the moves the lifts before it made", () => {
    const durationsMs = [1000, 1000, 1000, 1000];
    const automatic = [true, true, true, true];

    // The first lift moves the 1000 ms boundary to 700. A stale recompute would still measure
    // the second lift, at 1400, against the boundary's old place at 1000 (400 ms away) rather
    // than its new place at 700 (700 ms away) — and so would wrongly prefer it over the 2000 ms
    // boundary (600 ms away), moving the wrong pair of slides.
    const result = cutAtLifts(durationsMs, automatic, [700, 1400], MIN_SLIDE_MS);

    expect(result).toEqual([700, 700, 1600, 1000]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(4000);
  });

  it("leaves the durations unchanged where no boundary sits between two automatic slides", () => {
    const durationsMs = [1000, 1000];
    const automatic = [false, false];

    const result = cutAtLifts(durationsMs, automatic, [500], MIN_SLIDE_MS);

    expect(result).toEqual(durationsMs);
  });
});
