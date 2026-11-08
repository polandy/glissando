import { describe, expect, it } from "vitest";
import { snapToBeats } from "./snap-to-beats";

describe("snapToBeats around a tempo change", () => {
  it("measures the half-beat phrase tolerance by the beats around the cut, not the whole list", () => {
    // Beats every 1000 ms up to 4000, then every 250 ms up to 6000: the list averages 500 ms,
    // but around the cut a beat is 250 ms. The even share ends at 5200: the nearest beat is
    // 5250 (50 ms away), the phrase start 5000 is 200 ms away — more than 50 + 125.
    const beatsMs = [
      0,
      1000,
      2000,
      3000,
      4000,
      ...Array.from({ length: 8 }, (_, n) => 4250 + n * 250),
    ];
    expect(snapToBeats([5200, 800], [true, true], beatsMs, 100)).toEqual([5250, 750]);
  });
});
