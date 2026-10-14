import { CARD_INK_COLORS, CARD_STYLE_SPECS, layoutCard, type CardLine } from "./card-layout";
import type { CardTextSpec } from "./card-style-table";
import type { Size } from "./ken-burns";
import type { Card, CardInk } from "./slideshow";

/**
 * A card's title and subtitle as CSS declarations, one per broken line (ADR-0032,
 * `dev-docs/player/TITLE_CARDS.md` § Look): pure, built on `layoutCard`'s numbers. The DOM
 * renderer and the app's editor preview both call this so a card looks the same place drawn,
 * like `captionStyles` for captions.
 */

/** CSS declarations, by their `CSSStyleDeclaration` property names. */
export type CardDeclarations = Readonly<Record<string, string>>;

export interface CardLineStyle {
  readonly text: string;
  readonly declarations: CardDeclarations;
}

export interface CardStyles {
  readonly align: "left" | "center";
  readonly titleLines: readonly CardLineStyle[];
  readonly subtitleLines: readonly CardLineStyle[];
}

/** A line's width at a shrink `scale` (1 is the style's own size), as `layoutCard` needs. */
export type MeasureLine = (text: string, scale: number) => number;

/**
 * `card`'s title and subtitle laid out for a `stage` of this pixel size and styled per its
 * `style` and `ink`, measured through `measureTitle`/`measureSubtitle` (see `layoutCard`). Each
 * line is its own absolutely positioned element: `x`/`y` come straight from `layoutCard`, `left`
 * aligned lines sit at their `x`, `center` ones are shifted back by half their own width.
 */
export function cardStyles(
  card: Card,
  stage: Size,
  measureTitle: MeasureLine,
  measureSubtitle: MeasureLine,
): CardStyles {
  const layout = layoutCard(card, stage, measureTitle, measureSubtitle);
  const spec = CARD_STYLE_SPECS[card.style];
  const ink = CARD_INK_COLORS[card.ink];
  return {
    align: layout.align,
    titleLines: layout.titleLines.map((line) => lineStyle(line, spec.title, layout.align, ink)),
    subtitleLines: layout.subtitleLines.map((line) =>
      lineStyle(line, spec.subtitle, layout.align, ink),
    ),
  };
}

function lineStyle(
  line: CardLine,
  spec: CardTextSpec,
  align: "left" | "center",
  ink: (typeof CARD_INK_COLORS)[CardInk],
): CardLineStyle {
  return {
    text: line.text,
    declarations: {
      position: "absolute",
      left: `${line.x}px`,
      top: `${line.y}px`,
      // "left" anchors at its own left edge; "center" is shifted back by half its own width.
      transform: align === "center" ? "translateX(-50%)" : "none",
      fontFamily: spec.fontFamily,
      fontWeight: String(spec.fontWeight),
      fontStyle: spec.italic ? "italic" : "normal",
      fontSize: `${line.fontSizePx}px`,
      lineHeight: `${line.lineHeightPx}px`,
      letterSpacing: `${spec.trackingEm}em`,
      color: ink.color,
      textShadow: textShadow(ink, line.fontSizePx),
      whiteSpace: "nowrap",
      pointerEvents: "none",
    },
  };
}

function textShadow(ink: (typeof CARD_INK_COLORS)[CardInk], fontSizePx: number): string {
  if (ink.shadow === undefined) {
    return "none";
  }
  const { color, offsetYEm, blurEm } = ink.shadow;
  return `0 ${offsetYEm * fontSizePx}px ${blurEm * fontSizePx}px ${color}`;
}
