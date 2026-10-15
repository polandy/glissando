import { CARD_INK_COLORS, CARD_STYLE_SPECS, layoutCard, type CardTextSpec } from "../card-layout";
import { cardItemSlices, type CardItemSlice } from "../card-item-layout";
import { canvasCardMeasure } from "../card-measure";
import { cardItemTimingAt, type CardItemVisual } from "../card-timing";
import type { Size } from "../ken-burns";
import type { CardVisual } from "../ports";
import type { CardInk } from "../slideshow";

/**
 * A `words`/`letters` entrance's items as absolutely positioned spans, one per
 * `cardItemSlices` slice (ADR-0032, `dev-docs/player/TITLE_CARDS.md` § Entrances): each carries
 * its own opacity and drift from `cardItemTimingAt`, never the whole card's. Split out of
 * `dom-card.ts` to stay under the line limit.
 */

const ITEM_ATTRIBUTE = "data-card-item";

export function placeItemText(
  container: HTMLElement,
  cardVisual: CardVisual,
  layerOpacity: number,
  stage: Size,
): void {
  const card = cardVisual.card;
  const spec = CARD_STYLE_SPECS[card.style];
  const ink = CARD_INK_COLORS[card.ink];
  const measureTitle = canvasCardMeasure(spec.title, stage);
  const measureSubtitle = canvasCardMeasure(spec.subtitle, stage);
  const layout = layoutCard(card, stage, measureTitle, measureSubtitle);
  const slices = cardItemSlices(card, layout, stage, measureTitle, measureSubtitle);

  const existing = [...container.querySelectorAll<HTMLElement>(`[${ITEM_ATTRIBUTE}]`)];
  slices.forEach((slice, index) => {
    const element = existing[index] ?? newItem(container);
    const visual = cardItemTimingAt(
      card,
      index,
      slices.length,
      cardVisual.slideTimeMs,
      cardVisual.reducedMotion,
    );
    const textSpec = slice.part === "title" ? spec.title : spec.subtitle;
    styleItem(element, slice, textSpec, ink, visual, layerOpacity);
    if (element.textContent !== slice.text) {
      element.textContent = slice.text;
    }
  });
  for (const extra of existing.slice(slices.length)) {
    extra.remove();
  }
}

function newItem(container: HTMLElement): HTMLElement {
  const element = document.createElement("span");
  element.setAttribute(ITEM_ATTRIBUTE, "");
  container.append(element);
  return element;
}

function styleItem(
  element: HTMLElement,
  slice: CardItemSlice,
  spec: CardTextSpec,
  ink: (typeof CARD_INK_COLORS)[CardInk],
  visual: CardItemVisual,
  layerOpacity: number,
): void {
  Object.assign(element.style, {
    position: "absolute",
    left: `${slice.x}px`,
    top: `${slice.y}px`,
    width: `${slice.width}px`,
    height: `${slice.height}px`,
    fontFamily: spec.fontFamily,
    fontWeight: String(spec.fontWeight),
    fontStyle: spec.italic ? "italic" : "normal",
    fontSize: `${slice.fontSizePx}px`,
    lineHeight: `${slice.height}px`,
    letterSpacing: `${spec.trackingEm}em`,
    color: ink.color,
    textShadow: textShadow(ink, slice.fontSizePx),
    whiteSpace: "nowrap",
    pointerEvents: "none",
    opacity: String(visual.opacity * layerOpacity),
    transform: `translateY(${visual.driftEm}em)`,
  });
}

function textShadow(ink: (typeof CARD_INK_COLORS)[CardInk], fontSizePx: number): string {
  if (ink.shadow === undefined) {
    return "none";
  }
  const { color, offsetYEm, blurEm } = ink.shadow;
  return `0 ${offsetYEm * fontSizePx}px ${blurEm * fontSizePx}px ${color}`;
}
