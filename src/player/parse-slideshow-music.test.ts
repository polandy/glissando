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

const MUSIC = {
  src: "music/summer.mp3",
  startMs: 12_000,
  endMs: 150_000,
  fadeInMs: 2000,
  fadeOutMs: 5000,
};

function withMusic(music: unknown, formatVersion = 2): unknown {
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
  it("reads version 2's excerpt and fades unchanged", () => {
    expect(parseSlideshow(withMusic(MUSIC)).music).toEqual(MUSIC);
  });

  it("reads a version 1 slideshow's music as the whole track without fades", () => {
    const parsed = parseSlideshow(withMusic({ src: "music/summer.mp3" }, 1));

    expect(parsed.formatVersion).toBe(2);
    expect(parsed.music).toEqual({
      src: "music/summer.mp3",
      startMs: 0,
      fadeInMs: 0,
      fadeOutMs: 0,
    });
  });

  it("refuses version 2 fields in a version 1 slideshow", () => {
    expect(parseError(withMusic(MUSIC, 1)).path).toBe("music.startMs");
  });

  it.each([
    ["a missing start", { ...MUSIC, startMs: undefined }, "music.startMs", "a whole number ≥ 0"],
    ["a negative start", { ...MUSIC, startMs: -1 }, "music.startMs", "a whole number ≥ 0"],
    [
      "an end before the start",
      { ...MUSIC, endMs: 12_000 },
      "music.endMs",
      "after startMs (12000)",
    ],
    ["a fractional fade", { ...MUSIC, fadeInMs: 0.5 }, "music.fadeInMs", "a whole number ≥ 0"],
    [
      "fades outlasting the excerpt",
      { ...MUSIC, endMs: 18_000 },
      "music.fadeOutMs",
      "fadeInMs + fadeOutMs at most endMs − startMs (6000)",
    ],
  ])("rejects %s, naming the path and what to set", (_case, music, path, expected) => {
    const error = parseError(withMusic(music));

    expect(error.path).toBe(path);
    expect(error.message).toContain(expected);
  });
});
