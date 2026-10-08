import { describe, expect, it } from "vitest";
import { breakCaption, captionMetrics } from "./caption-layout";

/** Every character is 10 pixels wide. */
const monospace = (text: string): number => [...text].length * 10;

describe("captionMetrics", () => {
  it.each([
    ["a landscape screen, by its height", { width: 1920, height: 1080 }, 1, 1080 * 0.042],
    ["a portrait phone, by its width", { width: 390, height: 844 }, 1, 390 * 0.055],
    ["a small window, at 15 CSS pixels", { width: 240, height: 200 }, 1, 15],
    ["the minimum in device pixels", { width: 480, height: 400 }, 2, 30],
  ])("sizes the type for %s", (_, viewport, pixelsPerCssPixel, fontSize) => {
    expect(captionMetrics(viewport, pixelsPerCssPixel).fontSize).toBeCloseTo(fontSize);
  });

  it("derives spacing from the type size and the width limit from the screen", () => {
    const metrics = captionMetrics({ width: 1000, height: 1000 }, 1);

    expect(metrics.fontSize).toBeCloseTo(42);
    expect(metrics.lineHeight).toBeCloseTo(42 * 1.22);
    expect(metrics.left).toBeCloseTo(42 * 1.2);
    expect(metrics.bottom).toBeCloseTo(42 * 1.1);
    expect(metrics.maxWidth).toBeCloseTo(720);
  });

  it("limits a line to 34 em on a very wide screen", () => {
    const metrics = captionMetrics({ width: 6000, height: 1000 }, 1);

    expect(metrics.maxWidth).toBeCloseTo(34 * 42);
  });

  it("lays the gradient over the bottom 42 % of the screen, in whole pixels", () => {
    expect(captionMetrics({ width: 1920, height: 1080 }, 1).bandHeight).toBe(454);
  });

  it("makes the band tall enough for two lines when the screen is very flat", () => {
    const metrics = captionMetrics({ width: 1200, height: 60 }, 1);

    expect(metrics.bandHeight).toBeGreaterThanOrEqual(metrics.bottom + 2 * metrics.lineHeight);
  });
});

describe("breakCaption", () => {
  it("keeps a caption that fits on one line", () => {
    expect(breakCaption("Evening on the jetty", 200, monospace)).toEqual(["Evening on the jetty"]);
  });

  it("breaks between words onto a second line", () => {
    expect(breakCaption("Evening on the jetty", 150, monospace)).toEqual([
      "Evening on the",
      "jetty",
    ]);
  });

  it("ends the second line with an ellipsis when the caption needs more", () => {
    const lines = breakCaption("Evening on the jetty at the lake", 100, monospace);

    expect(lines).toEqual(["Evening on", "the jetty…"]);
    expect(lines.every((line) => monospace(line) <= 100)).toBe(true);
  });

  it("breaks a word longer than a line between its characters", () => {
    expect(breakCaption("Donaudampfschifffahrt", 100, monospace)).toEqual([
      "Donaudampf",
      "schifffah…",
    ]);
  });

  it("never drops below one character a line, however narrow", () => {
    expect(breakCaption("Steg", 5, monospace)).toEqual(["S", "…"]);
  });
});
