import { describe, expect, it } from "vitest";
import { parseSlideshow, SlideshowFormatError } from "./parse-slideshow";

const SLIDE = {
  image: { src: "pictures/1.jpg", capturedAt: "2025-07-01T10:00:00Z" },
  durationMs: 5000,
  kenBurns: {
    from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
    to: { zoom: 1.2, centerX: 0.4, centerY: 0.6 },
    easing: "ease-in-out",
  },
};

const TRACK = {
  src: "music/summer.mp3",
  startMs: 12_000,
  endMs: 150_000,
  fadeInMs: 2000,
  fadeOutMs: 5000,
  gain: 1,
};
const MUSIC = { ...TRACK, atMs: 0 };
const NEXT = {
  src: "music/autumn.mp3",
  atMs: 135_000,
  startMs: 0,
  endMs: 60_000,
  fadeInMs: 3000,
  fadeOutMs: 0,
  gain: 1.5,
};

function withMusic(music: unknown, formatVersion = 9): unknown {
  return { formatVersion, title: "July 2025", music, slides: [SLIDE] };
}

function parseError(input: unknown): SlideshowFormatError {
  try {
    parseSlideshow(input);
  } catch (error) {
    if (error instanceof SlideshowFormatError) {
      return error;
    }
    throw error;
  }
  throw new Error("expected parseSlideshow to reject the input");
}

describe("parseSlideshow music", () => {
  it("reads version 5's tracks, each with its place, excerpt and fades, unchanged", () => {
    expect(parseSlideshow(withMusic([MUSIC, NEXT])).music).toEqual([MUSIC, NEXT]);
  });

  it.each([1, 2, 3, 8])(
    "refuses a version %s slideshow, naming the version to set",
    (formatVersion) => {
      const error = parseError(withMusic(TRACK, formatVersion));

      expect(error.path).toBe("formatVersion");
      expect(error.message).toContain("expected 9");
    },
  );

  it.each([
    ["a single track not in a list", MUSIC, "music", "an array with at least one track"],
    ["an empty list", [], "music", "an array with at least one track"],
    [
      "a missing place",
      [MUSIC, { ...NEXT, atMs: undefined }],
      "music[1].atMs",
      "a whole number ≥ 0",
    ],
    [
      "a track starting before the one before it",
      [
        { ...NEXT, atMs: 1000 },
        { ...MUSIC, atMs: 0 },
      ],
      "music[1].atMs",
      "at least the previous track's atMs (1000)",
    ],
    ["an empty source", [MUSIC, { ...NEXT, src: "" }], "music[1].src", "a non-empty string"],
  ])("rejects %s in version 4, naming the path", (_case, music, path, expected) => {
    const error = parseError(withMusic(music));

    expect(error.path).toBe(path);
    expect(error.message).toContain(expected);
  });

  it.each([
    ["a missing start", { ...MUSIC, startMs: undefined }, "music[0].startMs", "a whole number ≥ 0"],
    ["a negative start", { ...MUSIC, startMs: -1 }, "music[0].startMs", "a whole number ≥ 0"],
    [
      "an end before the start",
      { ...MUSIC, endMs: 12_000 },
      "music[0].endMs",
      "after startMs (12000)",
    ],
    ["a fractional fade", { ...MUSIC, fadeInMs: 0.5 }, "music[0].fadeInMs", "a whole number ≥ 0"],
    [
      "fades outlasting the excerpt",
      { ...MUSIC, endMs: 18_000 },
      "music[0].fadeOutMs",
      "fadeInMs + fadeOutMs at most endMs − startMs (6000)",
    ],
    ["a missing gain", { ...MUSIC, gain: undefined }, "music[0].gain", "a positive finite number"],
    ["a zero gain", { ...MUSIC, gain: 0 }, "music[0].gain", "a positive finite number"],
    ["a negative gain", { ...MUSIC, gain: -1 }, "music[0].gain", "a positive finite number"],
    ["a NaN gain", { ...MUSIC, gain: Number.NaN }, "music[0].gain", "a positive finite number"],
    [
      "an infinite gain",
      { ...MUSIC, gain: Number.POSITIVE_INFINITY },
      "music[0].gain",
      "a positive finite number",
    ],
  ])("rejects a track with %s, naming the path and what to set", (_case, music, path, expected) => {
    const error = parseError(withMusic([music]));

    expect(error.path).toBe(path);
    expect(error.message).toContain(expected);
  });
});
