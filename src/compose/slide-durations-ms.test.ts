import { describe, expect, it } from "vitest";
import { slideDurationsMs } from "./slide-durations-ms";
import { MIN_SECONDS_PER_PICTURE } from "../library/stored-slideshow";

/** `count` pictures without an own duration. */
const automatic = (count: number) => Array.from({ length: count }, () => ({}));
const sum = (durations: readonly number[]) => durations.reduce((total, ms) => total + ms, 0);

describe("slideDurationsMs", () => {
  it("gives every picture secondsPerPicture when there is no music", () => {
    expect(slideDurationsMs(automatic(3), undefined, 5)).toEqual([5000, 5000, 5000]);
  });

  it("splits the music length evenly when it divides exactly", () => {
    expect(slideDurationsMs(automatic(4), 8000, 5)).toEqual([2000, 2000, 2000, 2000]);
  });

  it("puts the remainder milliseconds on the first slides so the sum matches the track", () => {
    const durations = slideDurationsMs(automatic(3), 10_000, 5);

    expect(durations).toEqual([3334, 3333, 3333]);
    expect(sum(durations)).toBe(10_000);
  });

  it("falls back to the minimum per picture when an even split would go below it", () => {
    const musicDurationMs = (MIN_SECONDS_PER_PICTURE - 1) * 1000 * 2;

    expect(slideDurationsMs(automatic(2), musicDurationMs, 5)).toEqual([
      MIN_SECONDS_PER_PICTURE * 1000,
      MIN_SECONDS_PER_PICTURE * 1000,
    ]);
  });

  it("throws when there is less than one picture", () => {
    expect(() => slideDurationsMs([], undefined, 5)).toThrow(RangeError);
  });

  describe("with own durations", () => {
    it("keeps an own duration exactly and gives the others secondsPerPicture without music", () => {
      expect(slideDurationsMs([{}, { durationMs: 8000 }, {}], undefined, 5)).toEqual([
        5000, 8000, 5000,
      ]);
    });

    it("shares the rest of the track evenly among the automatic pictures", () => {
      const durations = slideDurationsMs([{}, { durationMs: 8000 }, {}, {}], 23_000, 5);

      expect(durations).toEqual([5000, 8000, 5000, 5000]);
    });

    it("puts the remainder milliseconds on the first automatic picture so the sum matches", () => {
      const durations = slideDurationsMs([{ durationMs: 8000 }, {}, {}, {}], 18_001, 5);

      expect(durations).toEqual([8000, 3334, 3334, 3333]);
      expect(sum(durations)).toBe(18_001);
    });

    it("gives the automatic pictures the minimum when their share would go below it", () => {
      const durations = slideDurationsMs([{ durationMs: 15_000 }, {}, {}], 17_000, 5);

      expect(durations).toEqual([15_000, 2000, 2000]);
    });

    it("gives the automatic pictures the minimum when the own durations outlast the track", () => {
      const durations = slideDurationsMs([{ durationMs: 15_000 }, {}], 12_000, 5);

      expect(durations).toEqual([15_000, 2000]);
    });

    it("ignores the music when every picture has its own duration", () => {
      expect(slideDurationsMs([{ durationMs: 8000 }, { durationMs: 2500 }], 60_000, 5)).toEqual([
        8000, 2500,
      ]);
    });
  });
});
