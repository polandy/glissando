import { describe, expect, it } from "vitest";
import { envelopePoints, VIEW_HEIGHT, waveBars } from "./wave-view";

/** A 10 s track played from 2 s to 8 s with a 2 s fade in and a 2 s fade out. */
const MUSIC = {
  durationMs: 10_000,
  startMs: 2000,
  audibleEndMs: 8000,
  timing: { startMs: 2000, endMs: 8000, fadeInMs: 2000, fadeOutMs: 2000 },
};
const FULL = Array<number>(10).fill(1);

describe("waveBars", () => {
  it("shrinks the bars inside the fades with the details", () => {
    const bars = waveBars(FULL, MUSIC, true);

    // The bar at 2.5 s is a quarter into the 2 s fade in.
    expect(bars[2]?.share).toBeCloseTo(0.25);
    expect(bars[3]?.share).toBeCloseTo(0.75);
    expect(bars[4]?.share).toBe(1);
  });

  it("keeps every bar at its full height without the details", () => {
    const bars = waveBars(FULL, MUSIC, false);

    expect(bars.map(({ share }) => share)).toEqual(FULL);
  });

  it("marks the bars inside the excerpt, with or without the details", () => {
    for (const details of [true, false]) {
      expect(waveBars(FULL, MUSIC, details).map(({ inside }) => inside)).toEqual([
        false,
        false,
        true,
        true,
        true,
        true,
        true,
        true,
        false,
        false,
      ]);
    }
  });
});

describe("envelopePoints", () => {
  it("rises over the fade in and falls over the fade out", () => {
    expect(envelopePoints(MUSIC)).toBe(`200,${VIEW_HEIGHT} 400,2 600,2 800,${VIEW_HEIGHT}`);
  });
});
