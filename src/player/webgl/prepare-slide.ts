import type { BitmapPicture } from "../browser/bitmap-loader";
import { drawsBlurredCopy } from "../card-timing";
import type { Size } from "../ken-burns";
import type { PreparedSlide } from "../ports";
import type { Card } from "../slideshow";
import type { CaptionTextures } from "./caption-textures";
import type { CardTextures } from "./card-textures";
import type { PictureTextures } from "./picture-textures";

/** The renderer's own texture caches `prepareSlide` works a step of ahead of the slide reaching
 * the screen. */
export interface PrepareTargets {
  readonly pictures: PictureTextures;
  readonly captions: CaptionTextures;
  readonly cards: CardTextures;
  readonly displaySize: () => Size;
}

/**
 * One upload step of the picture (and its backdrop) per call, then its caption and card, or a
 * ground slide's card alone (see `PictureTextures`). Called from `WebGlRenderer.prepare`, which
 * first checks the context is not lost.
 */
export function prepareSlide(targets: PrepareTargets, slide: PreparedSlide<BitmapPicture>): void {
  if ("ground" in slide) {
    prepareCard(targets, slide.card);
    return;
  }
  if (!targets.pictures.isComplete(slide.picture)) {
    targets.pictures.prepareStep(slide.picture);
    return;
  }
  targets.captions.texture(slide.picture, slide.caption, targets.displaySize());
  if (slide.card !== undefined) {
    prepareCard(targets, slide.card);
  }
}

/**
 * Rasterises `card`'s texture and, for an entrance that may cross-fade from a blurred copy
 * (`focus`), that copy too — so neither costs the frame that first draws the card. `prepare`
 * has no reduced-motion signal of its own (`PreparedSlide` carries none), so this prepares the
 * blurred copy whenever the entrance may ever need one, even where reduced motion later skips
 * drawing it.
 */
function prepareCard(targets: PrepareTargets, card: Card): void {
  const viewport = targets.displaySize();
  targets.cards.texture(card, viewport);
  if (drawsBlurredCopy(card.entrance, false)) {
    targets.cards.blurredTexture(card, viewport);
  }
}
