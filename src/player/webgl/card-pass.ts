import { CARD_STYLE_SPECS, layoutCard } from "../card-layout";
import { cardItemSlices } from "../card-item-layout";
import { itemGranularity } from "../card-items";
import { canvasCardMeasure } from "../card-measure";
import { cardItemTimingAt } from "../card-timing";
import type { BitmapPicture } from "../browser/bitmap-loader";
import type { Size } from "../ken-burns";
import type { SlideLayer } from "../ports";
import { CardItemProgram } from "./card-item-program";
import type { CardTextures } from "./card-textures";

const CARD_ITEM_TEXTURE_UNIT = 8;

/**
 * A second, alpha-blended pass over the full-screen draw: each visible card's items, one quad per
 * item sampling its own slice of that card's texture (ADR-0032 § Entrances). `weightFrom`/
 * `weightTo` are the transition's own mix weights; for a single slide `progress` is already 0, so
 * `to`'s weight is 0 and nothing of it is drawn even though `from === to` there.
 */
export function drawCardPass(
  gl: WebGL2RenderingContext,
  cardItems: CardItemProgram,
  cards: CardTextures,
  from: SlideLayer<BitmapPicture>,
  weightFrom: number,
  to: SlideLayer<BitmapPicture>,
  weightTo: number,
  viewport: Size,
): void {
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  cardItems.use();
  drawCardLayer(cardItems, cards, from, weightFrom, viewport);
  drawCardLayer(cardItems, cards, to, weightTo, viewport);
  gl.disable(gl.BLEND);
}

/** `layer`'s own card, every item drawn at its own timing, scaled by `weight` (the transition's
 * share of this layer) and the card's own `textOpacity`; nothing below either. */
function drawCardLayer(
  cardItems: CardItemProgram,
  cards: CardTextures,
  layer: SlideLayer<BitmapPicture>,
  weight: number,
  viewport: Size,
): void {
  const visual = layer.card;
  if (visual === undefined || visual.textOpacity <= 0 || weight <= 0) {
    return;
  }
  const card = visual.card;
  const spec = CARD_STYLE_SPECS[card.style];
  const measureTitle = canvasCardMeasure(spec.title, viewport);
  const measureSubtitle = canvasCardMeasure(spec.subtitle, viewport);
  const layout = layoutCard(card, viewport, measureTitle, measureSubtitle);
  const slices = cardItemSlices(card, layout, viewport, measureTitle, measureSubtitle);
  const texture = cards.texture(card, viewport);
  const blurred =
    itemGranularity(card.entrance) === "block" ? cards.blurredTexture(card, viewport) : undefined;
  slices.forEach((slice, index) => {
    const item = cardItemTimingAt(
      card,
      index,
      slices.length,
      visual.slideTimeMs,
      visual.reducedMotion,
    );
    const shared = { slice, driftEm: item.driftEm, scale: item.scale };
    const opacity = item.opacity * visual.textOpacity * weight;
    if (opacity > 0) {
      cardItems.draw(texture, CARD_ITEM_TEXTURE_UNIT, viewport, { ...shared, opacity });
    }
    if (blurred !== undefined) {
      const blurOpacity = item.blurOpacity * visual.textOpacity * weight;
      if (blurOpacity > 0) {
        cardItems.draw(blurred, CARD_ITEM_TEXTURE_UNIT, viewport, {
          ...shared,
          opacity: blurOpacity,
        });
      }
    }
  });
}
