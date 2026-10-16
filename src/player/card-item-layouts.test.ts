import { describe, expect, it } from "vitest";
import { CardItemLayouts, type MeasureFactory } from "./card-item-layouts";
import type { CardTextSpec } from "./card-style-table";
import type { MeasureLine } from "./card-style";
import type { Size } from "./ken-burns";
import type { Card } from "./slideshow";

const STAGE: Size = { width: 400, height: 300 };
const OTHER_STAGE: Size = { width: 500, height: 300 };
/** Wide enough per character that `layoutCard` never has to break a line, so the layout this
 * memoises is deterministic without a real font. */
const PX_PER_CHARACTER = 10;

function card(title: string): Card {
  return { title, style: "modern", position: "centre", ink: "light", entrance: "words" };
}

/** A fake `MeasureFactory`, with no canvas or font behind it, that records every text spec it is
 * asked to build a measurer for — the positive signal that `CardItemLayouts` asked rather than
 * reused a cached one. */
function countingMeasureFactory(): {
  readonly factory: MeasureFactory;
  readonly calls: CardTextSpec[];
} {
  const calls: CardTextSpec[] = [];
  const measure: MeasureLine = (text, scale) => text.length * PX_PER_CHARACTER * scale;
  const factory: MeasureFactory = (spec) => {
    calls.push(spec);
    return measure;
  };
  return { factory, calls };
}

describe("CardItemLayouts", () => {
  it("asks its measure factory once per text spec the first time a card and stage are asked for, then reuses the result", () => {
    const { factory, calls } = countingMeasureFactory();
    const layouts = new CardItemLayouts(factory);
    const title = card("Two Words");

    const first = layouts.slicesFor(title, STAGE);
    const second = layouts.slicesFor(title, STAGE);
    const third = layouts.slicesFor(title, STAGE);

    expect(calls.length).toBe(2); // the title spec once, the subtitle spec once
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it("recomputes, asking the factory again, once the stage size changes", () => {
    const { factory, calls } = countingMeasureFactory();
    const layouts = new CardItemLayouts(factory);
    const title = card("Two Words");

    const atFirstStage = layouts.slicesFor(title, STAGE);
    const atOtherStage = layouts.slicesFor(title, OTHER_STAGE);

    expect(calls.length).toBe(4);
    expect(atOtherStage).not.toBe(atFirstStage);
  });

  it("keeps each card's own slices apart, by identity", () => {
    const { factory } = countingMeasureFactory();
    const layouts = new CardItemLayouts(factory);
    const first = card("First Card");
    const second = card("Second Card");

    const firstSlices = layouts.slicesFor(first, STAGE);
    const secondSlices = layouts.slicesFor(second, STAGE);
    const firstAgain = layouts.slicesFor(first, STAGE);

    expect(firstSlices).not.toBe(secondSlices);
    expect(firstAgain).toBe(firstSlices);
  });
});
