import { describe, expect, it } from "vitest";
import type { Card, GroundSlide, PictureSlide } from "../../player";
import { slideCaptionText, slideCaptureDate, slideCardShows } from "./slide-heading";

const CARD: Card = {
  title: "Sommer",
  style: "modern",
  position: "centre",
  ink: "light",
  entrance: "rise",
};
const KEN_BURNS = {
  from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  easing: "linear" as const,
};
const GROUND: GroundSlide = { ground: "#202020", durationMs: 2000, card: CARD };
const PICTURE: PictureSlide = {
  durationMs: 2000,
  image: { src: "p1.jpg", capturedAt: "2025-08-09T10:00:00Z" },
  kenBurns: KEN_BURNS,
};
const PICTURE_WITH_CARD: PictureSlide = { ...PICTURE, card: CARD };

describe("slideCardShows", () => {
  it("is false for undefined and for a plain picture slide", () => {
    expect(slideCardShows(undefined)).toBe(false);
    expect(slideCardShows(PICTURE)).toBe(false);
  });

  it("is true for a ground slide and for a picture slide with a card", () => {
    expect(slideCardShows(GROUND)).toBe(true);
    expect(slideCardShows(PICTURE_WITH_CARD)).toBe(true);
  });
});

describe("slideCaptureDate", () => {
  it("is the picture's own capture date", () => {
    expect(slideCaptureDate(PICTURE)).toBe("2025-08-09T10:00:00Z");
  });

  it("is undefined for a ground slide or when there is no current slide", () => {
    expect(slideCaptureDate(GROUND)).toBeUndefined();
    expect(slideCaptureDate(undefined)).toBeUndefined();
  });
});

describe("slideCaptionText", () => {
  it("is the picture's caption, or an empty string when it has none", () => {
    expect(slideCaptionText({ ...PICTURE, caption: "Abends am Steg" })).toBe("Abends am Steg");
    expect(slideCaptionText(PICTURE)).toBe("");
  });

  it("is an empty string for a ground slide or when there is no current slide", () => {
    expect(slideCaptionText(GROUND)).toBe("");
    expect(slideCaptionText(undefined)).toBe("");
  });
});
