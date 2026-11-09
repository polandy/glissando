import { describe, expect, it } from "vitest";
import { CARD_REDUCED_FADE_MS, cardItemTimingAt, cardTimingAt } from "./card-timing";
import type { Card } from "./slideshow";

describe("cardItemTimingAt: stagger order", () => {
  const staggered = { entrance: "words" as const, enterAtMs: 0 };

  it("has an earlier item further through its enter than a later one, same slide time", () => {
    const first = cardItemTimingAt(staggered, 0, 4, 300, false);
    const last = cardItemTimingAt(staggered, 3, 4, 300, false);

    expect(first.opacity).toBeGreaterThan(last.opacity);
  });

  it("reveals the last item first: its reverse index starts the reveal window at 0", () => {
    const revealing = { entrance: "words" as const, enterAtMs: 0, revealAtMs: 2000 };

    const lastItem = cardItemTimingAt(revealing, 3, 4, 2100, false);
    const firstItem = cardItemTimingAt(revealing, 0, 4, 2100, false);

    expect(lastItem.opacity).toBeLessThan(firstItem.opacity);
  });
});

describe("cardItemTimingAt: one presence with the whole card", () => {
  const rising = {
    title: "Summer at the Lake",
    style: "modern",
    position: "centre",
    ink: "light",
    entrance: "rise",
    enterAtMs: 500,
    revealAtMs: 3000,
  } satisfies Card;

  it.each([
    ["before the enter", 0],
    ["partway through the enter", 900],
    ["held", 2000],
    ["partway through the reveal", 3600],
    ["after the reveal", 5000],
  ])("matches cardTimingAt's opacity and drift for a one-item entrance, %s", (_, slideTimeMs) => {
    const card = cardTimingAt(rising, slideTimeMs, false);
    const item = cardItemTimingAt(rising, 0, 1, slideTimeMs, false);

    expect(item.opacity).toBeCloseTo(card.textOpacity);
    expect(item.driftEm).toBeCloseTo(card.driftEm);
  });

  it("has every staggered item fully dissolved once the last reveal window ends", () => {
    const revealing = { entrance: "words" as const, enterAtMs: 0, revealAtMs: 2000 };

    const opacities = [0, 1, 2, 3].map(
      (index) => cardItemTimingAt(revealing, index, 4, 10_000, false).opacity,
    );

    expect(opacities).toEqual([0, 0, 0, 0]);
  });
});

describe("cardItemTimingAt: focus cross-fade", () => {
  const focusCard = { entrance: "focus" as const, enterAtMs: 0 };

  it("is all blur, no sharp text, scaled up, when fully hidden", () => {
    const visual = cardItemTimingAt(focusCard, 0, 1, -1, false);

    expect(visual.opacity).toBe(0);
    expect(visual.blurOpacity).toBe(0);
    expect(visual.scale).toBeCloseTo(1.04);
  });

  it("is all sharp text, no blur, at native scale, once fully present", () => {
    const visual = cardItemTimingAt(focusCard, 0, 1, 10_000, false);

    expect(visual.opacity).toBeCloseTo(1);
    expect(visual.blurOpacity).toBeCloseTo(0);
    expect(visual.scale).toBeCloseTo(1);
  });

  it("cross-fades through a blurred peak partway through the enter", () => {
    const halfway = cardItemTimingAt(focusCard, 0, 1, 500, false);

    expect(halfway.opacity).toBeGreaterThan(0);
    expect(halfway.opacity).toBeLessThan(1);
    expect(halfway.blurOpacity).toBeGreaterThan(0);
    expect(halfway.scale).toBeGreaterThan(1);
    expect(halfway.scale).toBeLessThan(1.04);
  });
});

describe("cardItemTimingAt: reduced motion", () => {
  it("drops the stagger: every item shares the same plain fade", () => {
    const staggered = { entrance: "letters" as const, enterAtMs: 0 };

    const first = cardItemTimingAt(staggered, 0, 4, 200, true);
    const last = cardItemTimingAt(staggered, 3, 4, 200, true);

    expect(first.opacity).toBe(last.opacity);
    expect(first.driftEm).toBe(0);
    expect(first.scale).toBe(1);
  });

  it("gives focus a plain fade too: no blur, no scale change", () => {
    const visual = cardItemTimingAt(
      { entrance: "focus" as const, enterAtMs: 0 },
      0,
      1,
      CARD_REDUCED_FADE_MS / 2,
      true,
    );

    expect(visual.blurOpacity).toBe(0);
    expect(visual.scale).toBe(1);
  });
});
