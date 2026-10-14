import { describe, expect, it } from "vitest";
import { cardStyles } from "./card-style";
import { CARD_INK_COLORS, CARD_STYLE_SPECS } from "./card-style-table";
import type { Card, CardPosition, CardStyle } from "./slideshow";

/** Every character is 10 pixels wide at scale 1; narrower at a smaller scale. */
const monospace = (text: string, scale: number): number => [...text].length * 10 * scale;
const STAGE = { width: 1000, height: 1000 };

function card(style: CardStyle, position: CardPosition): Card {
  return { title: "Summer", subtitle: "June", style, position, ink: "light" };
}

describe("cardStyles", () => {
  it.each([
    ["modern", "centre"],
    ["quiet", "centre"],
    ["bold", "centre"],
    ["classic", "centre"],
    ["modern", "bottom-left"],
  ] as const)("styles %s at %s per its spec", (style, position) => {
    const spec = CARD_STYLE_SPECS[style];
    const result = cardStyles(card(style, position), STAGE, monospace, monospace);

    const titleLine = result.titleLines[0];
    expect(titleLine?.declarations.fontFamily).toBe(spec.title.fontFamily);
    expect(titleLine?.declarations.fontWeight).toBe(String(spec.title.fontWeight));
    expect(titleLine?.declarations.letterSpacing).toBe(`${spec.title.trackingEm}em`);
    expect(titleLine?.declarations.fontSize).toBe(`${spec.title.sizeFractionOfHeight * STAGE.height}px`);

    const subtitleLine = result.subtitleLines[0];
    expect(subtitleLine?.declarations.fontFamily).toBe(spec.subtitle.fontFamily);
    expect(subtitleLine?.declarations.fontStyle).toBe(spec.subtitle.italic ? "italic" : "normal");

    const expectedAlign = position === "bottom-left" || style === "bold" ? "left" : "center";
    expect(result.align).toBe(expectedAlign);
    expect(titleLine?.declarations.transform).toBe(
      expectedAlign === "center" ? "translateX(-50%)" : "none",
    );
  });

  it("colours light ink white with a shadow", () => {
    const result = cardStyles(card("modern", "centre"), STAGE, monospace, monospace);

    const titleLine = result.titleLines[0];
    expect(titleLine?.declarations.color).toBe(CARD_INK_COLORS.light.color);
    expect(titleLine?.declarations.textShadow).not.toBe("none");
  });

  it("colours dark ink without a shadow", () => {
    const result = cardStyles(
      { ...card("modern", "centre"), ink: "dark" },
      STAGE,
      monospace,
      monospace,
    );

    const titleLine = result.titleLines[0];
    expect(titleLine?.declarations.color).toBe(CARD_INK_COLORS.dark.color);
    expect(titleLine?.declarations.textShadow).toBe("none");
  });

  it("carries the broken title's text onto its line", () => {
    const result = cardStyles(card("modern", "centre"), STAGE, monospace, monospace);

    expect(result.titleLines.map((line) => line.text)).toEqual(["Summer"]);
  });

  it("has no subtitle lines without a subtitle", () => {
    const titleOnly: Card = { title: "Summer", style: "modern", position: "centre", ink: "light" };
    const result = cardStyles(titleOnly, STAGE, monospace, monospace);

    expect(result.subtitleLines).toEqual([]);
  });
});
