import { describe, expect, it } from "vitest";
import {
  breakCard,
  CARD_INK_COLORS,
  CARD_MAX_LINES,
  CARD_BOLD_MAX_LINES,
  CARD_STYLE_SPECS,
  layoutCard,
} from "./card-layout";
import type { Card } from "./slideshow";

/** Every character is 10 pixels wide at scale 1; narrower at a smaller scale. */
const monospace = (text: string, scale: number): number => [...text].length * 10 * scale;

describe("CARD_STYLE_SPECS", () => {
  it("sizes modern's title at 0.11 of the stage height, tracked tighter", () => {
    expect(CARD_STYLE_SPECS.modern.title.sizeFractionOfHeight).toBeCloseTo(0.11);
    expect(CARD_STYLE_SPECS.modern.title.trackingEm).toBeCloseTo(-0.01);
  });

  it("uppercases quiet's title at 0.065 of the stage height", () => {
    expect(CARD_STYLE_SPECS.quiet.title.uppercase).toBe(true);
    expect(CARD_STYLE_SPECS.quiet.title.sizeFractionOfHeight).toBeCloseTo(0.065);
  });

  it("gives bold a tighter line height and a Geist Mono subtitle", () => {
    expect(CARD_STYLE_SPECS.bold.title.lineHeightEm).toBeCloseTo(0.95);
    expect(CARD_STYLE_SPECS.bold.title.sizeFractionOfHeight).toBeCloseTo(0.16);
  });

  it("italicises classic's subtitle", () => {
    expect(CARD_STYLE_SPECS.classic.subtitle.italic).toBe(true);
  });
});

describe("CARD_INK_COLORS", () => {
  it("draws light ink white with a shadow", () => {
    expect(CARD_INK_COLORS.light.color).toBe("#FFFFFF");
    expect(CARD_INK_COLORS.light.shadow).toBeDefined();
  });

  it("draws dark ink without a shadow", () => {
    expect(CARD_INK_COLORS.dark.color).toBe("#2A2340");
    expect(CARD_INK_COLORS.dark.shadow).toBeUndefined();
  });
});

describe("breakCard", () => {
  it("keeps a short title on one line at full scale", () => {
    const result = breakCard("Lake", 1000, monospace, CARD_MAX_LINES);

    expect(result).toEqual({ lines: ["Lake"], scale: 1 });
  });

  it("breaks between words onto a second line", () => {
    const result = breakCard("Summer Lake", 70, monospace, CARD_MAX_LINES);

    expect(result.lines).toEqual(["Summer", "Lake"]);
    expect(result.scale).toBe(1);
  });

  it("allows a third line for bold", () => {
    const result = breakCard("One Two Three", 35, monospace, CARD_BOLD_MAX_LINES);

    expect(result.lines).toEqual(["One", "Two", "Three"]);
  });

  it("shrinks the title when it does not fit at full scale", () => {
    const result = breakCard("Wide", 25, monospace, CARD_MAX_LINES);

    expect(result.scale).toBeLessThan(1);
    expect(result.scale).toBeGreaterThanOrEqual(0.5);
    expect(result.lines.join("")).toBe("Wide");
  });

  it("ends in an ellipsis once even half size does not fit in the line budget", () => {
    const result = breakCard(
      "A Title Far Too Long For This Narrow Little Stage",
      40,
      monospace,
      CARD_MAX_LINES,
    );

    expect(result.scale).toBe(0.5);
    expect(result.lines.at(-1)?.endsWith("…")).toBe(true);
  });
});

describe("layoutCard", () => {
  const stage = { width: 1000, height: 1000 };

  function card(overrides: Partial<Card> = {}): Card {
    return {
      title: "Summer",
      style: "modern",
      position: "centre",
      ink: "light",
      ...overrides,
    };
  }

  it("centres a centre-position card both ways", () => {
    const layout = layoutCard(card(), stage, monospace, monospace);

    expect(layout.align).toBe("center");
    const line = layout.titleLines[0];
    expect(line?.x).toBeCloseTo(stage.width / 2);
  });

  it("left-aligns a bottom-left card at 7% of the width", () => {
    const layout = layoutCard(card({ position: "bottom-left" }), stage, monospace, monospace);

    expect(layout.align).toBe("left");
    expect(layout.titleLines[0]?.x).toBeCloseTo(stage.width * 0.07);
  });

  it("left-aligns bold even when centred", () => {
    const layout = layoutCard(card({ style: "bold" }), stage, monospace, monospace);

    expect(layout.align).toBe("left");
    expect(layout.titleLines[0]?.x).toBeCloseTo(stage.width * 0.07);
  });

  it("sets the subtitle 0.35 of the title size below the title", () => {
    const layout = layoutCard(card({ subtitle: "June 2026" }), stage, monospace, monospace);

    const titleFontSize = layout.titleLines[0]?.fontSizePx ?? 0;
    const titleBottom = (layout.titleLines[0]?.y ?? 0) + (layout.titleLines[0]?.lineHeightPx ?? 0);
    expect(layout.subtitleLines[0]?.y).toBeCloseTo(titleBottom + titleFontSize * 0.35);
  });

  it("has no subtitle lines without a subtitle", () => {
    const layout = layoutCard(card(), stage, monospace, monospace);

    expect(layout.subtitleLines).toEqual([]);
  });
});
