import { describe, expect, it } from "vitest";
import { cardItemSlices } from "./card-item-layout";
import { layoutCard } from "./card-layout";
import type { Card } from "./slideshow";

/** Every character is 10 pixels wide at scale 1; narrower at a smaller scale. */
const monospace = (text: string, scale: number): number => [...text].length * 10 * scale;
const STAGE = { width: 1000, height: 1000 };

function card(overrides: Partial<Card> = {}): Card {
  return {
    title: "Summer Lake",
    style: "modern",
    position: "centre",
    ink: "light",
    entrance: "rise",
    ...overrides,
  };
}

function slicesFor(overrides: Partial<Card> = {}) {
  const built = card(overrides);
  const layout = layoutCard(built, STAGE, monospace, monospace);
  return cardItemSlices(built, layout, STAGE, monospace, monospace);
}

describe("cardItemSlices: a whole-text entrance", () => {
  it("is a single slice for rise, the tight box around the title", () => {
    const slices = slicesFor({ entrance: "rise" });

    expect(slices).toHaveLength(1);
    const line = layoutCard(card({ entrance: "rise" }), STAGE, monospace, monospace).titleLines[0];
    const width = monospace("Summer Lake", 1);
    expect(slices[0]?.x).toBeCloseTo((line?.x ?? 0) - width / 2);
    expect(slices[0]?.width).toBeCloseTo(width);
  });

  it("is one slice for focus and for slow-fade too, never per word", () => {
    expect(slicesFor({ entrance: "focus" })).toHaveLength(1);
    expect(slicesFor({ entrance: "slow-fade" })).toHaveLength(1);
  });
});

describe("cardItemSlices: words", () => {
  it("slices each word in reading order, the second starting where the first ends plus a space", () => {
    const slices = slicesFor({ entrance: "words" });

    expect(slices).toHaveLength(2);
    const [summer, lake] = slices;
    expect(summer?.text).toBe("Summer");
    expect(lake?.text).toBe("Lake");
    // "Summer" is 6 chars (60px), then a 1-char space (10px) before "Lake" starts.
    expect((lake?.x ?? 0) - (summer?.x ?? 0)).toBeCloseTo(70);
    expect(summer?.width).toBeCloseTo(60);
    expect(lake?.width).toBeCloseTo(40);
  });

  it("gives every word its line's full height, not just its own glyphs", () => {
    const slices = slicesFor({ entrance: "words" });

    const line = layoutCard(card({ entrance: "words" }), STAGE, monospace, monospace).titleLines[0];
    for (const slice of slices) {
      expect(slice.height).toBeCloseTo(line?.lineHeightPx ?? 0);
      expect(slice.y).toBeCloseTo(line?.y ?? 0);
    }
  });

  it("counts the title's words before the subtitle's, in reading order", () => {
    const slices = slicesFor({ entrance: "words", subtitle: "June 2026" });

    expect(slices.map((slice) => slice.text)).toEqual(["Summer", "Lake", "June", "2026"]);
  });

  it("can fail: swapping the word order changes which slice is first", () => {
    const slices = slicesFor({ entrance: "words" });
    const reversed = [...slices].reverse();

    expect(slices.map((slice) => slice.text)).not.toEqual(reversed.map((slice) => slice.text));
  });
});

describe("cardItemSlices: letters", () => {
  it("slices each grapheme, skipping the space between words as its own item", () => {
    const slices = slicesFor({ entrance: "letters", title: "Ab C" });

    expect(slices.map((slice) => slice.text)).toEqual(["A", "b", "C"]);
    // "Ab" is 20px, then a 10px space, so "C" starts 30px after "A".
    expect((slices[2]?.x ?? 0) - (slices[0]?.x ?? 0)).toBeCloseTo(30);
  });
});
