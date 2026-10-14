import { describe, expect, it } from "vitest";
import {
  CARD_ENTER_MS,
  CARD_REDUCED_FADE_MS,
  CARD_REVEAL_MS,
  CARD_VEIL_MS,
  cardTimingAt,
  endFadeAmount,
} from "./card-timing";
import type { Card } from "./slideshow";

/** A card with no veil and no reveal: it enters and stays, as a title slide on a colour does. */
function heldCard(overrides: Partial<Card> = {}): Card {
  return {
    title: "Summer at the Lake",
    style: "modern",
    position: "centre",
    ink: "light",
    ...overrides,
  };
}

describe("cardTimingAt: enter", () => {
  it("is invisible, drifted, before enterAtMs", () => {
    const timing = cardTimingAt(heldCard({ enterAtMs: 500 }), 200, false);

    expect(timing.textOpacity).toBe(0);
    expect(timing.driftEm).toBeCloseTo(0.4);
  });

  it("is halfway drifted and more than halfway opaque mid-enter (ease-out)", () => {
    const timing = cardTimingAt(heldCard(), CARD_ENTER_MS / 2, false);

    expect(timing.textOpacity).toBeGreaterThan(0.5);
    expect(timing.driftEm).toBeCloseTo(0.4 * (1 - timing.textOpacity));
  });

  it("is fully in, with no drift, once CARD_ENTER_MS has passed", () => {
    const timing = cardTimingAt(heldCard({ enterAtMs: 1000 }), 1000 + CARD_ENTER_MS, false);

    expect(timing.textOpacity).toBe(1);
    expect(timing.driftEm).toBe(0);
  });

  it("stays fully in without a revealAtMs", () => {
    const timing = cardTimingAt(heldCard(), 60_000, false);

    expect(timing.textOpacity).toBe(1);
  });
});

describe("cardTimingAt: veil", () => {
  it("has no veil when the card carries none", () => {
    expect(cardTimingAt(heldCard(), 5000, false).veilAmount).toBe(0);
  });

  it("ramps from 0 at the slide's start when the card starts at 0", () => {
    const card = heldCard({ veil: { amount: 0.6, tint: "#2A2340" } });

    expect(cardTimingAt(card, 0, false).veilAmount).toBe(0);
    expect(cardTimingAt(card, CARD_VEIL_MS, false).veilAmount).toBeCloseTo(0.6);
  });

  it("veils in with the card when it starts after 0", () => {
    const card = heldCard({ enterAtMs: 1000, veil: { amount: 0.6, tint: "#2A2340" } });

    expect(cardTimingAt(card, 500, false).veilAmount).toBe(0);
    expect(cardTimingAt(card, 1000, false).veilAmount).toBe(0);
    expect(cardTimingAt(card, 1000 + CARD_VEIL_MS, false).veilAmount).toBeCloseTo(0.6);
  });
});

describe("cardTimingAt: reveal", () => {
  const revealing = heldCard({ enterAtMs: 0, revealAtMs: 2000 });

  it("is still fully in right at revealAtMs", () => {
    const timing = cardTimingAt(revealing, 2000, false);

    expect(timing.textOpacity).toBeCloseTo(1);
    expect(timing.driftEm).toBeCloseTo(0);
  });

  it("is fully dissolved, drifted up, CARD_REVEAL_MS after revealAtMs", () => {
    const timing = cardTimingAt(revealing, 2000 + CARD_REVEAL_MS, false);

    expect(timing.textOpacity).toBeCloseTo(0);
    expect(timing.driftEm).toBeCloseTo(-0.3);
  });

  it("lifts the veil to 0 over the same window", () => {
    const card = heldCard({
      enterAtMs: 0,
      revealAtMs: 2000,
      veil: { amount: 0.6, tint: "#2A2340" },
    });

    expect(cardTimingAt(card, 2000 + CARD_REVEAL_MS, false).veilAmount).toBeCloseTo(0);
  });

  it("gives the caption the complement of the text opacity", () => {
    const timing = cardTimingAt(revealing, 2000 + CARD_REVEAL_MS / 2, false);

    expect(timing.captionOpacity).toBeCloseTo(1 - timing.textOpacity);
  });
});

describe("cardTimingAt: reduced motion", () => {
  it("drops the drift to 0 even mid-enter", () => {
    const timing = cardTimingAt(heldCard(), CARD_ENTER_MS / 2, true);

    expect(timing.driftEm).toBe(0);
  });

  it("finishes the enter fade in CARD_REDUCED_FADE_MS, not CARD_ENTER_MS", () => {
    const timing = cardTimingAt(heldCard(), CARD_REDUCED_FADE_MS, true);

    expect(timing.textOpacity).toBe(1);
  });

  it("finishes the reveal fade in CARD_REDUCED_FADE_MS, not CARD_REVEAL_MS", () => {
    const card = heldCard({ enterAtMs: 0, revealAtMs: 2000 });
    const timing = cardTimingAt(card, 2000 + CARD_REDUCED_FADE_MS, true);

    expect(timing.textOpacity).toBe(0);
  });
});

describe("endFadeAmount", () => {
  it("is 0 before the fade window starts", () => {
    expect(endFadeAmount(1000, 10_000, 8_000)).toBe(0);
  });

  it("is 0 right at the start of the fade window", () => {
    expect(endFadeAmount(1000, 10_000, 9_000)).toBe(0);
  });

  it("is 1 (black) at the very end of the show", () => {
    expect(endFadeAmount(1000, 10_000, 10_000)).toBe(1);
  });

  it("is partway through, mid fade", () => {
    const amount = endFadeAmount(1000, 10_000, 9_500);

    expect(amount).toBeGreaterThan(0);
    expect(amount).toBeLessThan(1);
  });
});
