import { describe, expect, it } from "vitest";
import {
  checkVideoExcerpt,
  checkVideoVolume,
  InvalidVideoError,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_EXCERPT_MS,
  MAX_VIDEO_VOLUME,
  MIN_VIDEO_EXCERPT_MS,
  VIDEO_VOLUME_STEP,
} from "./own-video";

const SOURCE_MS = 60_000;

describe("MAX_VIDEO_BYTES", () => {
  it("is 1 GiB", () => {
    expect(MAX_VIDEO_BYTES).toBe(1024 ** 3);
  });
});

describe("checkVideoExcerpt", () => {
  it.each([
    ["the whole short clip", 0, 2000, 2000],
    ["the shortest excerpt", 100, 100 + MIN_VIDEO_EXCERPT_MS, SOURCE_MS],
    ["the longest excerpt", 0, MAX_VIDEO_EXCERPT_MS, MAX_VIDEO_EXCERPT_MS + 1],
    ["the end of the clip", 50_000, SOURCE_MS, SOURCE_MS],
  ])("accepts %s", (_name, startMs, endMs, sourceMs) => {
    expect(checkVideoExcerpt({ sourceMs, startMs, endMs }, "picture")).toEqual({ startMs, endMs });
  });

  it.each([
    ["a fractional start", 0.5, 5000, SOURCE_MS, "startMs"],
    ["a negative start", -1, 5000, SOURCE_MS, "startMs"],
    ["a fractional end", 0, 5000.5, SOURCE_MS, "endMs"],
    ["an end before the shortest excerpt", 0, MIN_VIDEO_EXCERPT_MS - 1, SOURCE_MS, "endMs"],
    ["an excerpt over 5 minutes", 0, MAX_VIDEO_EXCERPT_MS + 1, 600_000, "endMs"],
    ["an end past the clip", 0, SOURCE_MS + 1, SOURCE_MS, "endMs"],
  ])("rejects %s naming the field and value", (_name, startMs, endMs, sourceMs, field) => {
    const bad = (): unknown => checkVideoExcerpt({ sourceMs, startMs, endMs }, 'picture "a"');

    expect(bad).toThrow(InvalidVideoError);
    try {
      bad();
    } catch (error) {
      expect((error as InvalidVideoError).field).toBe(field);
      expect((error as Error).message).toContain(`picture "a" ${field}`);
      expect((error as Error).message).toContain(
        JSON.stringify(field === "endMs" ? endMs : startMs),
      );
    }
  });
});

describe("checkVideoVolume", () => {
  it.each([0, VIDEO_VOLUME_STEP, 55, MAX_VIDEO_VOLUME])("accepts %s", (volume) => {
    expect(checkVideoVolume(volume, "picture")).toBe(volume);
  });

  it.each([-5, 3, 102.5, 105, "50", Number.NaN])("rejects %s", (volume) => {
    expect(() => checkVideoVolume(volume, 'picture "a"')).toThrow(InvalidVideoError);
  });
});
