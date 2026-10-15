import { describe, expect, it } from "vitest";
import { parseSlideshow, SlideshowFormatError } from "./parse-slideshow";
import { MAX_VIDEO_EXCERPT_MS, MIN_VIDEO_EXCERPT_MS } from "./slideshow";
import { pictureSlide } from "./testing/picture-slide";

const STILL = { zoom: 1, centerX: 0.5, centerY: 0.5 };

function videoSlide(
  video: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const startMs = 1900;
  const endMs = 10_300;
  return {
    image: { src: "pictures/3.jpg", capturedAt: "2025-07-02T10:00:00Z" },
    video: { src: "videos/3.mp4", startMs, endMs, volume: 0.8, duckMusic: true, ...video },
    durationMs: endMs - startMs,
    kenBurns: { from: STILL, to: STILL, easing: "linear" },
    ...overrides,
  };
}

function show(...slides: Record<string, unknown>[]): unknown {
  return { formatVersion: 7, title: "Clips", slides };
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

describe("parseSlideshow, video slides", () => {
  it("accepts a video slide and returns it unchanged", () => {
    const input = show(videoSlide());

    expect(parseSlideshow(input)).toEqual(input);
    expect(pictureSlide(parseSlideshow(input).slides[0]).video?.src).toBe("videos/3.mp4");
  });

  it("accepts a video without duckMusic", () => {
    const input = show(videoSlide({ duckMusic: undefined }));

    expect(pictureSlide(parseSlideshow(input).slides[0]).video?.duckMusic).toBeUndefined();
  });

  it("accepts the shortest and the longest excerpt", () => {
    const shortest = videoSlide(
      { startMs: 0, endMs: MIN_VIDEO_EXCERPT_MS },
      { durationMs: MIN_VIDEO_EXCERPT_MS },
    );
    const longest = videoSlide(
      { startMs: 0, endMs: MAX_VIDEO_EXCERPT_MS },
      { durationMs: MAX_VIDEO_EXCERPT_MS },
    );

    expect(parseSlideshow(show(shortest, longest)).slides).toHaveLength(2);
  });

  it("refuses a version below 7", () => {
    expect(parseError({ ...(show(videoSlide()) as object), formatVersion: 6 }).path).toBe(
      "formatVersion",
    );
  });

  it.each([
    [
      "an excerpt that is too short",
      show(
        videoSlide(
          { startMs: 0, endMs: MIN_VIDEO_EXCERPT_MS - 1 },
          { durationMs: MIN_VIDEO_EXCERPT_MS - 1 },
        ),
      ),
      "slides[0].video.endMs",
    ],
    [
      "an excerpt that is too long",
      show(
        videoSlide(
          { startMs: 0, endMs: MAX_VIDEO_EXCERPT_MS + 1 },
          { durationMs: MAX_VIDEO_EXCERPT_MS + 1 },
        ),
      ),
      "slides[0].video.endMs",
    ],
    [
      "an end before the start",
      show(videoSlide({ startMs: 5000, endMs: 4000 }, { durationMs: 1000 })),
      "slides[0].video.endMs",
    ],
    [
      "a negative start",
      show(videoSlide({ startMs: -1 }, { durationMs: 10_301 })),
      "slides[0].video.startMs",
    ],
    ["a fractional end", show(videoSlide({ endMs: 10_300.5 })), "slides[0].video.endMs"],
    [
      "a duration that differs from the excerpt",
      show(videoSlide({}, { durationMs: 8000 })),
      "slides[0].durationMs",
    ],
    ["a volume above 1", show(videoSlide({ volume: 1.1 })), "slides[0].video.volume"],
    ["a negative volume", show(videoSlide({ volume: -0.1 })), "slides[0].video.volume"],
    ["a missing volume", show(videoSlide({ volume: undefined })), "slides[0].video.volume"],
    ["an empty source", show(videoSlide({ src: "" })), "slides[0].video.src"],
    ["a non-boolean duckMusic", show(videoSlide({ duckMusic: "no" })), "slides[0].video.duckMusic"],
    ["an unknown key", show(videoSlide({ loop: true })), "slides[0].video.loop"],
    [
      "a Ken Burns motion",
      show(
        videoSlide(
          {},
          { kenBurns: { from: STILL, to: { ...STILL, zoom: 1.2 }, easing: "linear" } },
        ),
      ),
      "slides[0].kenBurns",
    ],
    [
      "a zoomed still framing",
      show(
        videoSlide(
          {},
          {
            kenBurns: {
              from: { ...STILL, zoom: 1.2 },
              to: { ...STILL, zoom: 1.2 },
              easing: "linear",
            },
          },
        ),
      ),
      "slides[0].kenBurns",
    ],
    [
      "a partner",
      show(
        videoSlide(
          {},
          {
            partner: {
              image: { src: "pictures/4.jpg", capturedAt: "2025-07-02T10:00:00Z" },
              kenBurns: { from: STILL, to: STILL, easing: "linear" },
            },
          },
        ),
      ),
      "slides[0].partner",
    ],
  ])("rejects %s with its path", (_name, input, path) => {
    expect(parseError(input).path).toBe(path);
  });
});
