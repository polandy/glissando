import { describe, expect, it } from "vitest";
import { cardEnterMs, CARD_REVEAL_MS } from "./card-timing";
import { parseSlideshow, SlideshowFormatError } from "./parse-slideshow";
import { isGroundSlide, type Card, type GroundSlide, type Slide } from "./slideshow";

/** Every ground slide this file parses carries a card, by construction. */
function groundSlide(slide: Slide | undefined): GroundSlide {
  if (slide === undefined || !isGroundSlide(slide)) {
    throw new Error("expected a ground slide");
  }
  return slide;
}

const KEN_BURNS = {
  from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  to: { zoom: 1.2, centerX: 0.5, centerY: 0.5 },
  easing: "linear",
};

function validCard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: "Lake Garda",
    style: "modern",
    position: "centre",
    ink: "light",
    entrance: "rise",
    ...overrides,
  };
}

function validPictureSlide(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    image: { src: "pictures/1.jpg", capturedAt: "2025-07-01T10:00:00Z" },
    durationMs: 5000,
    kenBurns: KEN_BURNS,
    ...overrides,
  };
}

function validGroundSlide(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ground: "#102030", durationMs: 5000, card: validCard(), ...overrides };
}

function validSlideshow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    formatVersion: 7,
    title: "July 2025",
    slides: [validGroundSlide(), validPictureSlide()],
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

describe("a ground slide (ADR-0032)", () => {
  it("accepts a ground colour and its card in place of a picture", () => {
    const input = validSlideshow();

    const slide = groundSlide(parseSlideshow(input).slides[0]);

    expect(slide.ground).toBe("#102030");
    expect(slide.card).toEqual<Card>({
      title: "Lake Garda",
      style: "modern",
      position: "centre",
      ink: "light",
      entrance: "rise",
    });
  });

  it("rejects a ground slide carrying a picture's image", () => {
    const input = validSlideshow({
      slides: [
        { ...validGroundSlide(), image: { src: "a.jpg", capturedAt: "2025-07-01T10:00:00Z" } },
        validPictureSlide(),
      ],
    });

    const error = parseError(input);

    expect(error.path).toBe("slides[0].image");
    expect(error.message).toContain("unknown key");
  });

  it("rejects a ground slide missing its card", () => {
    const input = validSlideshow({
      slides: [{ ground: "#102030", durationMs: 5000 }, validPictureSlide()],
    });

    const error = parseError(input);

    expect(error.path).toBe("slides[0].card");
    expect(error.message).toContain("a card");
  });

  it.each([
    ["too short", "#102"],
    ["without the leading #", "102030"],
    ["not hexadecimal", "#gggggg"],
  ])("rejects a ground colour that is %s", (_case, ground) => {
    const error = parseError(
      validSlideshow({ slides: [validGroundSlide({ ground }), validPictureSlide()] }),
    );

    expect(error.path).toBe("slides[0].ground");
    expect(error.message).toContain("#RRGGBB");
  });
});

describe("a card's veil and revealAtMs (ADR-0032)", () => {
  const riseEnterMs = cardEnterMs({ title: "Lake Garda", entrance: "rise" });

  it("accepts a veil and a revealAtMs that respect both margins", () => {
    const card = validCard({
      enterAtMs: 0,
      revealAtMs: riseEnterMs,
      veil: { amount: 0.5, tint: "#000000" },
    });
    const input = validSlideshow({ slides: [validPictureSlide({ durationMs: 10_000, card })] });

    const slide = parseSlideshow(input).slides[0];

    expect(slide?.card?.revealAtMs).toBe(riseEnterMs);
    expect(slide?.card?.veil).toEqual({ amount: 0.5, tint: "#000000" });
  });

  it("rejects a revealAtMs closer to enterAtMs than the entrance's cardEnterMs", () => {
    const card = validCard({ enterAtMs: 0, revealAtMs: riseEnterMs - 1 });
    const input = validSlideshow({ slides: [validPictureSlide({ durationMs: 10_000, card })] });

    const error = parseError(input);

    expect(error.path).toBe("slides[0].card.revealAtMs");
    expect(error.message).toContain(`at least enterAtMs + cardEnterMs (${riseEnterMs})`);
  });

  it("rejects a revealAtMs closer to the slide's end than CARD_REVEAL_MS", () => {
    const durationMs = 10_000;
    const card = validCard({ revealAtMs: durationMs - CARD_REVEAL_MS + 1 });
    const input = validSlideshow({ slides: [validPictureSlide({ durationMs, card })] });

    const error = parseError(input);

    expect(error.path).toBe("slides[0].card.revealAtMs");
    expect(error.message).toContain(
      `at most the slide's durationMs − CARD_REVEAL_MS (${durationMs - CARD_REVEAL_MS})`,
    );
  });

  it("rejects a veil's tint that is not a #RRGGBB colour", () => {
    const card = validCard({ veil: { amount: 0.5, tint: "black" } });
    const input = validSlideshow({ slides: [validPictureSlide({ card })] });

    const error = parseError(input);

    expect(error.path).toBe("slides[0].card.veil.tint");
    expect(error.message).toContain("#RRGGBB");
  });

  it("rejects a veil on a ground slide: it is picture slides only", () => {
    const groundWithVeil = {
      ...validGroundSlide(),
      card: validCard({ veil: { amount: 0.5, tint: "#000000" } }),
    };
    const input = validSlideshow({ slides: [groundWithVeil, validPictureSlide()] });

    const error = parseError(input);

    expect(error.path).toBe("slides[0].card.veil");
    expect(error.message).toContain("unknown key");
  });

  it("rejects a revealAtMs on a ground slide: it is picture slides only", () => {
    const groundWithReveal = {
      ...validGroundSlide(),
      card: validCard({ revealAtMs: 1000 }),
    };
    const input = validSlideshow({ slides: [groundWithReveal, validPictureSlide()] });

    const error = parseError(input);

    expect(error.path).toBe("slides[0].card.revealAtMs");
    expect(error.message).toContain("unknown key");
  });
});

describe("a show's endFadeMs (ADR-0032)", () => {
  it("accepts an endFadeMs within the last slide's durationMs", () => {
    const input = validSlideshow({
      slides: [validGroundSlide(), validPictureSlide({ durationMs: 5000 })],
      endFadeMs: 2000,
    });

    expect(parseSlideshow(input).endFadeMs).toBe(2000);
  });

  it("rejects an endFadeMs that is not positive", () => {
    const input = validSlideshow({ endFadeMs: 0 });

    const error = parseError(input);

    expect(error.path).toBe("endFadeMs");
    expect(error.message).toContain("a positive integer");
  });

  it("rejects an endFadeMs longer than the last slide's durationMs", () => {
    const input = validSlideshow({
      slides: [validGroundSlide(), validPictureSlide({ durationMs: 5000 })],
      endFadeMs: 5001,
    });

    const error = parseError(input);

    expect(error.path).toBe("endFadeMs");
    expect(error.message).toContain("at most the last slide's durationMs (5000)");
  });
});
