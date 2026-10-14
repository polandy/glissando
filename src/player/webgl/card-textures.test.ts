import { describe, expect, it } from "vitest";
import { cardDriftFraction } from "./card-textures";

describe("cardDriftFraction", () => {
  it("scales the drift by the title's rendered font size, not the viewport", () => {
    // 0.5em at a 40px title, over a 1000px-tall viewport: 20px, or 0.02 of the height.
    expect(cardDriftFraction(0.5, 40, 1000)).toBeCloseTo(0.02);
  });

  it("is zero at zero drift, whatever the font size", () => {
    expect(cardDriftFraction(0, 200, 1000)).toBe(0);
  });

  it("follows a shrunk title: the same em drifts fewer px once the title's font size shrinks", () => {
    const atFullSize = cardDriftFraction(0.4, 100, 1000);
    const atHalfSize = cardDriftFraction(0.4, 50, 1000);

    expect(atHalfSize).toBeCloseTo(atFullSize / 2);
  });
});
