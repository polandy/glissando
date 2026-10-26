import { describe, expect, it } from "vitest";
import { picturesFillMs, targetSecondsPerPicture } from "./filled-length";

/** `count` automatic pictures, each weighing 1 unless `weight` is given. */
const automatic = (count: number, weight?: number) =>
  Array.from({ length: count }, () => (weight === undefined ? {} : { weight }));

describe("picturesFillMs", () => {
  it("fills the playlist in fill mode, whatever the pictures", () => {
    expect(picturesFillMs(20_000, automatic(6), undefined, undefined)).toBe(20_000);
  });

  it("fills nothing in fill mode without a playlist", () => {
    expect(picturesFillMs(undefined, automatic(6), undefined, undefined)).toBeUndefined();
  });

  it("keeps the target once the music is at least as long", () => {
    expect(picturesFillMs(40_000, automatic(6), 5, undefined)).toBeUndefined();
  });

  it("fits 6 pictures at 5 s into a 20 s playlist, right at the ⅔ floor", () => {
    const fitted = picturesFillMs(20_000, automatic(6), 5, undefined);

    expect(fitted).toBe(20_000);
  });

  it("keeps 5 s when 12 pictures would squeeze below the ⅔ floor of a 20 s playlist", () => {
    expect(picturesFillMs(20_000, automatic(12), 5, undefined)).toBeUndefined();
  });

  it("fits Calm's 7 s target right at its 4.67 s floor", () => {
    // 3 pictures × 7 s = 21 s outlasts 14 s; 14 s / 3 = 4.667 s, Calm's floor exactly.
    expect(picturesFillMs(14_000, automatic(3), 7, undefined)).toBe(14_000);
  });

  it("keeps Calm's 7 s when the floor is missed by a millisecond", () => {
    expect(picturesFillMs(13_999, automatic(3), 7, undefined)).toBeUndefined();
  });

  it("fits Lively's 3 s target right at its 2 s floor (MIN_SLIDE_DURATION_MS, not below it)", () => {
    // 3 pictures × 3 s = 9 s outlasts 6 s; 6 s / 3 = 2 s, Lively's ⅔ floor equals the minimum.
    expect(picturesFillMs(6000, automatic(3), 3, undefined)).toBe(6000);
  });

  it("keeps Lively's 3 s once the floor would fall below the minimum", () => {
    expect(picturesFillMs(5000, automatic(3), 3, undefined)).toBeUndefined();
  });

  it("counts a picture's own duration against the outlast check and the share", () => {
    // 1 own 10 s + 2 automatic × 5 s = 20 s outlasts 16 s; (16 - 10) / 2 = 3 s, below the 3.33 s floor.
    const pictures = [{ durationMs: 10_000 }, {}, {}];

    expect(picturesFillMs(16_000, pictures, 5, undefined)).toBeUndefined();
  });

  it("fits once the own duration leaves the automatic pictures enough", () => {
    // 1 own 2 s + 2 automatic × 6 s = 14 s outlasts 10 s; (10 - 2) / 2 = 4 s, right at the ⅔ floor.
    const pictures = [{ durationMs: 2000 }, {}, {}];

    expect(picturesFillMs(10_000, pictures, 6, undefined)).toBe(10_000);
  });

  it("keeps the target when the music repeats, even though it would otherwise fit", () => {
    expect(picturesFillMs(20_000, automatic(6), 5, true)).toBeUndefined();
  });

  it("keeps the target unchanged when the music is already longer", () => {
    expect(picturesFillMs(60_000, automatic(6), 5, undefined)).toBeUndefined();
  });

  it("keeps the target when every picture already has its own duration", () => {
    const pictures = [{ durationMs: 30_000 }, { durationMs: 30_000 }];

    expect(picturesFillMs(10_000, pictures, 5, undefined)).toBeUndefined();
  });
});

describe("targetSecondsPerPicture", () => {
  it("is absent in fill mode", () => {
    expect(targetSecondsPerPicture(undefined, 5)).toBeUndefined();
  });

  it("is secondsPerPicture with an own picture length", () => {
    expect(targetSecondsPerPicture("seconds", 5)).toBe(5);
  });

  it("is the mood's seconds, even over an own picture length", () => {
    expect(targetSecondsPerPicture("seconds", 5, 7)).toBe(7);
  });

  it("is the mood's seconds without an own picture length too", () => {
    expect(targetSecondsPerPicture(undefined, 5, 3)).toBe(3);
  });
});
