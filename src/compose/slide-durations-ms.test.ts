import { describe, expect, it } from "vitest";
import { slideDurationsMs } from "./slide-durations-ms";
import { MIN_SECONDS_PER_PICTURE } from "../library/stored-slideshow";

describe("slideDurationsMs", () => {
  it("gives every picture secondsPerPicture when there is no music", () => {
    expect(slideDurationsMs(3, undefined, 5)).toEqual([5000, 5000, 5000]);
  });

  it("splits the music length evenly when it divides exactly", () => {
    expect(slideDurationsMs(4, 8000, 5)).toEqual([2000, 2000, 2000, 2000]);
  });

  it("puts the remainder milliseconds on the first slides so the sum matches the track", () => {
    const durations = slideDurationsMs(3, 10_000, 5);

    expect(durations).toEqual([3334, 3333, 3333]);
    expect(durations.reduce((sum, ms) => sum + ms, 0)).toBe(10_000);
  });

  it("falls back to the minimum per picture when an even split would go below it", () => {
    const musicDurationMs = (MIN_SECONDS_PER_PICTURE - 1) * 1000 * 2;

    expect(slideDurationsMs(2, musicDurationMs, 5)).toEqual([
      MIN_SECONDS_PER_PICTURE * 1000,
      MIN_SECONDS_PER_PICTURE * 1000,
    ]);
  });

  it("throws when there is less than one picture", () => {
    expect(() => slideDurationsMs(0, undefined, 5)).toThrow(RangeError);
  });
});
