import { describe, expect, it } from "vitest";
import { slideDurationsMs } from "./slide-durations-ms";
import { MIN_SECONDS_PER_PICTURE } from "../library/stored-slideshow";

const automatic = (count: number) => Array.from({ length: count }, () => ({}));
const sum = (durations: readonly number[]) => durations.reduce((total, ms) => total + ms, 0);
/** Beats every `periodMs` from `firstMs` up to `untilMs`, in ms of the excerpt. */
const beatsEvery = (periodMs: number, firstMs: number, untilMs: number) =>
  Array.from(
    { length: Math.floor((untilMs - firstMs) / periodMs) + 1 },
    (_, n) => firstMs + n * periodMs,
  );
const MIN_MS = MIN_SECONDS_PER_PICTURE * 1000;

describe("slideDurationsMs on the music's beats", () => {
  it("moves each boundary between two automatic slides to the nearest beat", () => {
    // Even shares end at 5000, 10000 and 15000; the nearest beats are 4900, 9800 and 14700.
    const durations = slideDurationsMs(automatic(4), 20_000, 5, beatsEvery(700, 0, 20_000));

    expect(durations).toEqual([4900, 4900, 4900, 5300]);
  });

  it("keeps the last boundary at the excerpt's end, so the slideshow still ends with the music", () => {
    const durations = slideDurationsMs(automatic(3), 10_000, 5, beatsEvery(450, 120, 9990));

    expect(sum(durations)).toBe(10_000);
  });

  it("keeps the even share where the excerpt holds no beat", () => {
    expect(slideDurationsMs(automatic(3), 10_000, 5, [])).toEqual([3334, 3333, 3333]);
  });

  it("never leaves a slide below the minimum: it takes the nearest beat that keeps both above", () => {
    // Even shares end at 2334 and 4667. The second boundary's nearest beat, 5010, would leave the
    // last slide at 1990 ms, so it takes 4310, the nearest that keeps both slides at 2000 or more.
    const durations = slideDurationsMs(automatic(3), 7000, 5, [2300, 4310, 5010]);

    expect(durations).toEqual([2300, 2010, 2690]);
    expect(Math.min(...durations)).toBeGreaterThanOrEqual(MIN_MS);
  });

  it("does not move a boundary when no beat keeps both neighbours at the minimum", () => {
    expect(slideDurationsMs(automatic(2), 4000, 5, [1900])).toEqual([2000, 2000]);
  });

  it("does not move the boundary after a picture with an own duration, which stays exact", () => {
    // The own 3000 ms picture comes first; the automatic ones share 10 000 ms, meeting at 8000.
    const pictures = [{ durationMs: 3000 }, {}, {}];

    expect(slideDurationsMs(pictures, 13_000, 5, [2800, 3200, 7900])).toEqual([3000, 4900, 5100]);
  });

  it("moves the boundary ending an automatic slide onto the beat, so the own-duration picture after it starts there, and snaps the next automatic boundaries again", () => {
    // Shares of 3334, 3000 (own), 3333 and 3333 end at 3334, 6334, 9667 and 13 000. The first
    // boundary takes the beat at 3000, the own picture keeps its 3000 ms, the slide after it
    // takes up the difference, and the boundary at 9667 takes the beat at 9500.
    const pictures = [{}, { durationMs: 3000 }, {}, {}];

    expect(slideDurationsMs(pictures, 13_000, 5, [3000, 9500])).toEqual([3000, 3000, 3500, 3500]);
  });

  it("keeps the slide after an own-duration picture at the minimum: it takes the nearest beat that does", () => {
    // Shares of 3000 each, the third picture's own. The second boundary's nearest beat, 7100,
    // would leave the last slide at 1900 ms, so it takes 4600.
    const pictures = [{}, {}, { durationMs: 3000 }, {}];
    const durations = slideDurationsMs(pictures, 12_000, 5, [2400, 4600, 7100]);

    expect(durations).toEqual([2400, 2200, 3000, 4400]);
    expect(Math.min(...durations)).toBeGreaterThanOrEqual(MIN_MS);
  });

  it("does not move the boundary before own-duration pictures that end the slideshow, which ends with the music", () => {
    const pictures = [{}, {}, { durationMs: 3000 }];

    expect(slideDurationsMs(pictures, 13_000, 5, [4900, 9800])).toEqual([4900, 5100, 3000]);
  });

  it("does not move boundaries beyond the music's end, where the slideshow outlasts it", () => {
    const durations = slideDurationsMs(automatic(4), 5000, 5, [1900, 4100]);

    expect(durations).toEqual([MIN_MS, MIN_MS, MIN_MS, MIN_MS]);
  });
});
