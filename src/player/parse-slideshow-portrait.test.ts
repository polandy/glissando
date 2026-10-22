import { describe, expect, it } from "vitest";
import { parseSlideshow, SlideshowFormatError } from "./parse-slideshow";
import { pictureSlide } from "./testing/picture-slide";

const KEN_BURNS = {
  from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  to: { zoom: 1.2, centerX: 0.5, centerY: 0.5 },
  easing: "linear",
};

function validSlide(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    image: { src: "pictures/1.jpg", capturedAt: "2025-07-01T10:00:00Z" },
    durationMs: 5000,
    kenBurns: KEN_BURNS,
    ...overrides,
  };
}

function validSlideshow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    formatVersion: 9,
    title: "July 2025",
    slides: [validSlide()],
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

describe("a slide's partner and fit (ADR-0028)", () => {
  it("accepts a partner, the second picture of a composed pair", () => {
    const partner = {
      image: { src: "pictures/2.jpg", capturedAt: "2025-07-01T11:00:00Z" },
      kenBurns: KEN_BURNS,
    };
    const input = validSlideshow({ slides: [validSlide({ partner })] });

    expect(pictureSlide(parseSlideshow(input).slides[0]).partner).toEqual(partner);
  });

  it('accepts fit "cover", which turns the blurred fill off', () => {
    const input = validSlideshow({ slides: [validSlide({ fit: "cover" })] });

    expect(pictureSlide(parseSlideshow(input).slides[0]).fit).toBe("cover");
  });

  it("leaves partner and fit absent when the slide has neither", () => {
    const parsed = parseSlideshow(validSlideshow());

    expect(parsed.slides[0]).not.toHaveProperty("partner");
    expect(parsed.slides[0]).not.toHaveProperty("fit");
  });

  it("rejects a partner missing its kenBurns", () => {
    const partner = { image: { src: "pictures/2.jpg", capturedAt: "2025-07-01T11:00:00Z" } };
    const error = parseError(validSlideshow({ slides: [validSlide({ partner })] }));

    expect(error.path).toBe("slides[0].partner.kenBurns");
  });

  it("rejects an empty partner image source", () => {
    const partner = {
      image: { src: "", capturedAt: "2025-07-01T11:00:00Z" },
      kenBurns: KEN_BURNS,
    };
    const error = parseError(validSlideshow({ slides: [validSlide({ partner })] }));

    expect(error.path).toBe("slides[0].partner.image.src");
  });

  it('rejects a fit value that is not "cover"', () => {
    const error = parseError(validSlideshow({ slides: [validSlide({ fit: "contain" })] }));

    expect(error.path).toBe("slides[0].fit");
    expect(error.message).toContain('"cover"');
  });

  it("refuses a version 3 file: it predates partner and fit", () => {
    const error = parseError(validSlideshow({ formatVersion: 3 }));

    expect(error.path).toBe("formatVersion");
    expect(error.message).toContain("expected 9, got 3");
  });
});
