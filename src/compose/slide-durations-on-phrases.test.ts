import { describe, expect, it } from "vitest";
import { slideDurationsMs } from "./slide-durations-ms";

const automatic = (count: number) => Array.from({ length: count }, () => ({}));
/** Beats every `periodMs` from 0 up to `untilMs`. */
const beatsEvery = (periodMs: number, untilMs: number) =>
  Array.from({ length: Math.floor(untilMs / periodMs) + 1 }, (_, n) => n * periodMs);

describe("slideDurationsMs on the music's phrases", () => {
  it("takes the start of a four-beat phrase when it is at most half a beat further than the nearest beat", () => {
    // Beats every 500 ms, phrases start at 0, 2000, 4000. The even share ends at 2300: the nearest
    // beat is 2500, 200 ms away; the phrase start 2000 is 300 ms away.
    expect(slideDurationsMs(automatic(2), 4600, 2.3, beatsEvery(500, 4600))).toEqual([2000, 2600]);
  });

  it("keeps the nearest beat when the phrase start is more than half a beat further away", () => {
    // The even share ends at 3200: the nearest beat is 3000, the phrase start 4000 is 800 ms away.
    expect(slideDurationsMs(automatic(2), 6400, 3.2, beatsEvery(500, 6400))).toEqual([3000, 3400]);
  });
});
