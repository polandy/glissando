import { CARD_STYLE_SPECS, layoutCard } from "../card-layout";
import { cardItemSlices } from "../card-item-layout";
import { canvasCardMeasure } from "../card-measure";
import { cardItemTimingAt, drawsBlurredCopy } from "../card-timing";
import type { BitmapPicture } from "../browser/bitmap-loader";
import type { Size } from "../ken-burns";
import type { SlideLayer } from "../ports";
import type { CardRenderTarget } from "./card-render-target";
import { CardItemProgram } from "./card-item-program";
import type { CardTextures } from "./card-textures";

const CARD_ITEM_TEXTURE_UNIT = 8;

/**
 * Rasterises `layer`'s card, one quad per item at its own timing (ADR-0032 § Entrances), into
 * `target` at `viewport`'s resolution — left transparent where the layer has no visible card.
 * The transition shader then samples `target`'s texture exactly as it samples the layer's
 * picture, so the card carries through wipes, pushes and zooms with its own slide rather than
 * fading as an overlay independent of them.
 */
export function renderCardLayer(
  gl: WebGL2RenderingContext,
  cardItems: CardItemProgram,
  cards: CardTextures,
  target: CardRenderTarget,
  layer: SlideLayer<BitmapPicture>,
  viewport: Size,
): void {
  target.renderInto(viewport, () => {
    const visual = layer.card;
    if (visual === undefined || visual.textOpacity <= 0) {
      return;
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    cardItems.use();
    drawCardItems(cardItems, cards, layer, viewport);
    gl.disable(gl.BLEND);
  });
}

/** Every item of `layer`'s card, each at its own entrance timing and the card's own
 * `textOpacity`; nothing if the layer has none. */
function drawCardItems(
  cardItems: CardItemProgram,
  cards: CardTextures,
  layer: SlideLayer<BitmapPicture>,
  viewport: Size,
): void {
  const visual = layer.card;
  if (visual === undefined) {
    return;
  }
  const card = visual.card;
  const spec = CARD_STYLE_SPECS[card.style];
  const measureTitle = canvasCardMeasure(spec.title, viewport);
  const measureSubtitle = canvasCardMeasure(spec.subtitle, viewport);
  const layout = layoutCard(card, viewport, measureTitle, measureSubtitle);
  const slices = cardItemSlices(card, layout, viewport, measureTitle, measureSubtitle);
  const texture = cards.texture(card, viewport);
  const blurred = drawsBlurredCopy(card.entrance, visual.reducedMotion)
    ? cards.blurredTexture(card, viewport)
    : undefined;
  slices.forEach((slice, index) => {
    const item = cardItemTimingAt(
      card,
      index,
      slices.length,
      visual.slideTimeMs,
      visual.reducedMotion,
    );
    const shared = { slice, driftEm: item.driftEm, scale: item.scale };
    const opacity = item.opacity * visual.textOpacity;
    if (opacity > 0) {
      cardItems.draw(texture, CARD_ITEM_TEXTURE_UNIT, viewport, { ...shared, opacity });
    }
    if (blurred !== undefined) {
      const blurOpacity = item.blurOpacity * visual.textOpacity;
      if (blurOpacity > 0) {
        cardItems.draw(blurred, CARD_ITEM_TEXTURE_UNIT, viewport, {
          ...shared,
          opacity: blurOpacity,
        });
      }
    }
  });
}
