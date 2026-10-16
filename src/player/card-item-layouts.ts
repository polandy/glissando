import { CARD_STYLE_SPECS, layoutCard, type CardTextSpec } from "./card-layout";
import { cardItemSlices, type CardItemSlice } from "./card-item-layout";
import type { MeasureLine } from "./card-style";
import type { Size } from "./ken-burns";
import type { Card } from "./slideshow";

/**
 * Builds a `MeasureLine` for one of a style's text specs at a given stage size, e.g.
 * `canvasCardMeasure`'s throwaway Canvas 2D context. Kept as a factory, rather than a measure
 * function the caller builds itself, so `CardItemLayouts` controls exactly when it is asked for
 * one: once per card and stage, never once per frame.
 */
export type MeasureFactory = (spec: CardTextSpec, stage: Size) => MeasureLine;

interface CachedSlices {
  readonly stage: Size;
  readonly slices: readonly CardItemSlice[];
}

/**
 * A memo of a card's item slices (`cardItemSlices`), keyed by `Card` identity and recomputed
 * only when the stage changes size: a title card is stable by identity across frames (ADR-0032),
 * so laying it out and measuring its text on every frame it is drawn is wasted work. Both
 * renderers share one instance of this class rather than measuring and laying out their own
 * (`card-pass.ts`, `dom-card-items.ts`); `dom-card.ts`'s `#stylesFor` caches its own, separate,
 * block-text layout the same way.
 */
export class CardItemLayouts {
  readonly #measure: MeasureFactory;
  readonly #cache = new WeakMap<Card, CachedSlices>();

  constructor(measure: MeasureFactory) {
    this.#measure = measure;
  }

  /** `card`'s items as slices of its layout, for `stage`. */
  slicesFor(card: Card, stage: Size): readonly CardItemSlice[] {
    const cached = this.#cache.get(card);
    if (cached !== undefined && sameSize(cached.stage, stage)) {
      return cached.slices;
    }
    const spec = CARD_STYLE_SPECS[card.style];
    const measureTitle = this.#measure(spec.title, stage);
    const measureSubtitle = this.#measure(spec.subtitle, stage);
    const layout = layoutCard(card, stage, measureTitle, measureSubtitle);
    const slices = cardItemSlices(card, layout, stage, measureTitle, measureSubtitle);
    this.#cache.set(card, { stage, slices });
    return slices;
  }
}

function sameSize(a: Size, b: Size): boolean {
  return a.width === b.width && a.height === b.height;
}
