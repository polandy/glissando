import { describe, expect, it } from "vitest";
import { parseSlideshow, SlideshowFormatError } from "./parse-slideshow";

function validSlide(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    image: { src: "pictures/1.jpg", capturedAt: "2025-07-01T10:00:00Z" },
    durationMs: 5000,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1.2, centerX: 0.4, centerY: 0.6 },
      easing: "ease-in-out",
    },
    ...overrides,
  };
}

function validSlideshow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    formatVersion: 1,
    title: "July 2025",
    music: { src: "music/summer.mp3" },
    slides: [
      validSlide({ transitionToNext: { effect: "crossfade", durationMs: 1000 } }),
      validSlide(),
    ],
    ...overrides,
  };
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

describe("parseSlideshow", () => {
  it("accepts a complete slideshow and returns it unchanged", () => {
    const input = validSlideshow();

    expect(parseSlideshow(input)).toEqual(input);
  });

  it("accepts a slideshow without music", () => {
    const withoutMusic = validSlideshow();
    delete withoutMusic.music;

    expect(parseSlideshow(withoutMusic).music).toBeUndefined();
  });

  it("accepts a slide's caption", () => {
    const input = validSlideshow({ slides: [validSlide({ caption: "Evening on the jetty" })] });

    expect(parseSlideshow(input).slides[0]?.caption).toBe("Evening on the jetty");
  });

  it("accepts a slide without a transition as a hard cut", () => {
    const input = validSlideshow({ slides: [validSlide(), validSlide()] });

    expect(parseSlideshow(input).slides[0]?.transitionToNext).toBeUndefined();
  });

  it.each([
    ["not an object", "a slideshow", "", "an object"],
    [{ ...validSlideshow(), formatVersion: 2 }, "formatVersion", "formatVersion", "1"],
    [validSlideshow({ title: 7 }), "title", "title", "a string"],
    [validSlideshow({ slides: [] }), "no slides", "slides", "at least one slide"],
    [
      validSlideshow({ slides: [validSlide({ durationMs: 0 })] }),
      "a zero duration",
      "slides[0].durationMs",
      "a positive integer",
    ],
    [
      validSlideshow({ slides: [validSlide({ durationMs: 2500.5 })] }),
      "a fractional duration",
      "slides[0].durationMs",
      "a positive integer",
    ],
    [
      validSlideshow({ slides: [validSlide({ image: { src: "", capturedAt: "2025-07-01" } })] }),
      "an empty picture source",
      "slides[0].image.src",
      "a non-empty string",
    ],
    [
      validSlideshow({
        slides: [validSlide({ image: { src: "a.jpg", capturedAt: "yesterday" } })],
      }),
      "a capture date that is no ISO 8601 date",
      "slides[0].image.capturedAt",
      "an ISO 8601 date",
    ],
    [
      validSlideshow({
        slides: [
          validSlide({
            kenBurns: {
              from: { zoom: 0.5, centerX: 0.5, centerY: 0.5 },
              to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
              easing: "linear",
            },
          }),
        ],
      }),
      "a zoom below crop-to-fit",
      "slides[0].kenBurns.from.zoom",
      "a number ≥ 1",
    ],
    [
      validSlideshow({
        slides: [
          validSlide({
            kenBurns: {
              from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
              to: { zoom: 1, centerX: 1.5, centerY: 0.5 },
              easing: "linear",
            },
          }),
        ],
      }),
      "a centre outside the picture",
      "slides[0].kenBurns.to.centerX",
      "a number from 0 to 1",
    ],
    [
      validSlideshow({
        slides: [
          validSlide({
            kenBurns: {
              from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
              to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
              easing: "bounce",
            },
          }),
        ],
      }),
      "an unknown easing",
      "slides[0].kenBurns.easing",
      "one of linear, ease-in, ease-out, ease-in-out",
    ],
    [
      validSlideshow({
        slides: [
          validSlide({ transitionToNext: { effect: "spin", durationMs: 1000 } }),
          validSlide(),
        ],
      }),
      "an unknown transition effect",
      "slides[0].transitionToNext.effect",
      "one of crossfade, push-left, wipe-right, circle-open, zoom-in, dissolve",
    ],
    [
      validSlideshow({
        slides: [
          validSlide({
            durationMs: 1000,
            transitionToNext: { effect: "crossfade", durationMs: 1500 },
          }),
          validSlide(),
        ],
      }),
      "a transition longer than its slide",
      "slides[0].transitionToNext.durationMs",
      "at most the slide's durationMs (1000)",
    ],
    [
      validSlideshow({
        slides: [validSlide({ transitionToNext: { effect: "crossfade", durationMs: 500 } })],
      }),
      "a transition on the last slide",
      "slides[0].transitionToNext",
      "absent on the last slide",
    ],
    [
      validSlideshow({ music: { src: "" } }),
      "an empty music source",
      "music.src",
      "a non-empty string",
    ],
  ])("rejects %s: %s, naming the path and what to set", (input, _case, path, expected) => {
    const error = parseError(input);

    expect(error.path).toBe(path);
    expect(error.message).toContain(expected);
  });

  it.each([
    ["a non-string caption", 7],
    ["an empty caption", ""],
    ["a multi-line caption", "Evening\non the jetty"],
    ["a caption with padding", " Evening "],
    ["a caption longer than 80 characters", "a".repeat(81)],
  ])("rejects %s, naming the path and what to set", (_case, caption) => {
    const error = parseError(validSlideshow({ slides: [validSlide({ caption })] }));

    expect(error.path).toBe("slides[0].caption");
    expect(error.message).toContain("a single-line string of 1 to 80 characters");
  });

  it.each([
    ["the slideshow", validSlideshow({ autoplay: true }), "autoplay"],
    [
      "a slide",
      validSlideshow({ slides: [validSlide({ subtitle: "Beach" })] }),
      "slides[0].subtitle",
    ],
    [
      "a framing",
      validSlideshow({
        slides: [
          validSlide({
            kenBurns: {
              from: { zoom: 1, centerX: 0.5, centerY: 0.5, rotate: 5 },
              to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
              easing: "linear",
            },
          }),
        ],
      }),
      "slides[0].kenBurns.from.rotate",
    ],
  ])("rejects an unknown key in %s", (_where, input, path) => {
    const error = parseError(input);

    expect(error.path).toBe(path);
    expect(error.message).toContain("unknown key");
  });

  it("names the bad value in the message", () => {
    const error = parseError(validSlideshow({ slides: [validSlide({ durationMs: -3 })] }));

    expect(error.message).toBe("slides[0].durationMs: expected a positive integer, got -3");
  });
});
