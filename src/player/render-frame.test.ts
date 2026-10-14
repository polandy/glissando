import { describe, expect, it } from "vitest";
import { cardTimingAt } from "./card-timing";
import { renderFrame, type RenderFrameContext } from "./render-frame";
import type { Card, GroundSlide, PictureSlide, Slideshow } from "./slideshow";
import type { TimelineFrame } from "./timeline";

function heldCard(overrides: Partial<Card> = {}): Card {
  return {
    title: "Summer at the Lake",
    style: "modern",
    position: "centre",
    ink: "light",
    ...overrides,
  };
}

function groundSlide(card: Card): GroundSlide {
  return { ground: "#2A2340", durationMs: 4000, card };
}

function pictureSlide(overrides: Partial<PictureSlide> = {}): PictureSlide {
  return {
    image: { src: "a.jpg", capturedAt: "2025-07-01T10:00:00Z" },
    durationMs: 4000,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1.2, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
    ...overrides,
  };
}

const NO_FADE: RenderFrameContext = { showDurationMs: 4000, reducedMotion: false };

function slideFrame(index: number, slideTimeMs: number, showTimeMs = slideTimeMs): TimelineFrame {
  return { kind: "slide", slide: { index, kenBurnsProgress: 0, slideTimeMs }, showTimeMs };
}

describe("renderFrame: ground slides (ADR-0032)", () => {
  it("draws a ground slide as a ground layer carrying its hex colour", () => {
    const slideshow: Slideshow = {
      formatVersion: 5,
      title: "Opening",
      slides: [groundSlide(heldCard())],
    };

    const drawn = renderFrame(slideFrame(0, 1000), slideshow, NO_FADE, () => undefined);

    expect(drawn.kind === "slide" && drawn.slide.kind === "ground" && drawn.slide.ground).toBe(
      "#2A2340",
    );
  });

  it("computes the ground slide's card timing the same way cardTimingAt does", () => {
    const card = heldCard({ enterAtMs: 0 });
    const slideshow: Slideshow = {
      formatVersion: 5,
      title: "Opening",
      slides: [groundSlide(card)],
    };

    const drawn = renderFrame(slideFrame(0, 400), slideshow, NO_FADE, () => undefined);

    const expected = cardTimingAt(card, 400, false);
    expect(drawn.kind === "slide" && drawn.slide.kind === "ground" && drawn.slide.card).toEqual({
      card,
      textOpacity: expected.textOpacity,
      driftEm: expected.driftEm,
      veilAmount: expected.veilAmount,
    });
  });

  it("never loads a picture for a ground slide: picturesAt is never asked", () => {
    const slideshow: Slideshow = {
      formatVersion: 5,
      title: "Opening",
      slides: [groundSlide(heldCard())],
    };
    let asked = false;

    renderFrame(slideFrame(0, 0), slideshow, NO_FADE, () => {
      asked = true;
      return undefined;
    });

    expect(asked).toBe(false);
  });
});

describe("renderFrame: a picture slide's card (ADR-0032)", () => {
  const picture = { src: "a.jpg", width: 1600, height: 900 };

  it("carries the card's timing and discounts the caption by the text opacity", () => {
    const card = heldCard({ enterAtMs: 0 });
    const slideshow: Slideshow = {
      formatVersion: 5,
      title: "Lake",
      slides: [pictureSlide({ card, caption: "At the lake" })],
    };

    const drawn = renderFrame(slideFrame(0, 400), slideshow, NO_FADE, () => [picture]);

    const expectedTextOpacity = cardTimingAt(card, 400, false).textOpacity;
    expect(
      drawn.kind === "slide" && drawn.slide.kind === "picture" && drawn.slide.card?.textOpacity,
    ).toBe(expectedTextOpacity);
    expect(
      drawn.kind === "slide" && drawn.slide.kind === "picture" && drawn.slide.captionOpacity,
    ).toBe(1 - expectedTextOpacity);
    expect(drawn.kind === "slide" && drawn.slide.kind === "picture" && drawn.slide.caption).toBe(
      "At the lake",
    );
  });

  it("leaves card and captionOpacity absent on a slide without a card", () => {
    const slideshow: Slideshow = {
      formatVersion: 5,
      title: "Lake",
      slides: [pictureSlide({ caption: "At the lake" })],
    };

    const drawn = renderFrame(slideFrame(0, 400), slideshow, NO_FADE, () => [picture]);

    expect(
      drawn.kind === "slide" && drawn.slide.kind === "picture" && drawn.slide.card,
    ).toBeUndefined();
    expect(
      drawn.kind === "slide" && drawn.slide.kind === "picture" && drawn.slide.captionOpacity,
    ).toBeUndefined();
  });

  it("shortens the card's drift under reduced motion, unlike the default motion", () => {
    const card = heldCard({ enterAtMs: 0 });
    const slideshow: Slideshow = {
      formatVersion: 5,
      title: "Lake",
      slides: [pictureSlide({ card })],
    };

    const normal = renderFrame(slideFrame(0, 0), slideshow, NO_FADE, () => [picture]);
    const reduced = renderFrame(
      slideFrame(0, 0),
      slideshow,
      { ...NO_FADE, reducedMotion: true },
      () => [picture],
    );

    const normalDrift =
      normal.kind === "slide" && normal.slide.kind === "picture"
        ? normal.slide.card?.driftEm
        : undefined;
    const reducedDrift =
      reduced.kind === "slide" && reduced.slide.kind === "picture"
        ? reduced.slide.card?.driftEm
        : undefined;
    expect(normalDrift).toBeCloseTo(0.4);
    expect(reducedDrift).toBe(0);
  });
});

describe("renderFrame: the end fade (ADR-0032)", () => {
  it("is 0 when the show has no endFadeMs, even at the very end", () => {
    const slideshow: Slideshow = {
      formatVersion: 5,
      title: "Lake",
      slides: [pictureSlide()],
    };

    const drawn = renderFrame(
      slideFrame(0, 4000, 4000),
      slideshow,
      { showDurationMs: 4000, reducedMotion: false },
      () => [picture],
    );

    expect(drawn.endFade).toBe(0);
  });

  it("mixes to black over the show's last endFadeMs, reaching 1 at the very end", () => {
    const slideshow: Slideshow = {
      formatVersion: 5,
      title: "Lake",
      endFadeMs: 1000,
      slides: [pictureSlide()],
    };

    const beforeFade = renderFrame(
      slideFrame(0, 2000, 2000),
      slideshow,
      { showDurationMs: 4000, reducedMotion: false },
      () => [picture],
    );
    const atEnd = renderFrame(
      slideFrame(0, 4000, 4000),
      slideshow,
      { showDurationMs: 4000, reducedMotion: false },
      () => [picture],
    );

    expect(beforeFade.endFade).toBe(0);
    expect(atEnd.endFade).toBe(1);
  });

  const picture = { src: "a.jpg", width: 1600, height: 900 };
});
