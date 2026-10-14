import { afterEach, describe, expect, it } from "vitest";
import type { BitmapPicture } from "../browser/bitmap-loader";
import type { PictureSlideLayer, RenderFrame } from "../ports";
import { RED, solidBitmap, standingStill, type Rgb } from "../testing/browser-pictures";
import {
  baseCard,
  cardVisual,
  groundLayer,
  isColour,
  setUpCardRenderer,
  WHOLE_PICTURE,
} from "./testing/card-render-fixtures";

let box: HTMLElement;
afterEach(() => box.remove());

describe("WebGlRenderer crossfade out of a title card", () => {
  it("shows the ground colour on the from side early in the crossfade, not black", async () => {
    const support = setUpCardRenderer();
    box = support.box;
    await support.renderer.cardFontLoaded("modern");
    const picture = await solidBitmap(RED);
    const to: PictureSlideLayer<BitmapPicture> = {
      kind: "picture",
      picture,
      motion: standingStill(WHOLE_PICTURE),
    };
    const card = baseCard({ entrance: "rise" });
    const from = groundLayer(cardVisual(card, { textOpacity: 1, slideTimeMs: 3000 }));
    const frame: RenderFrame<BitmapPicture> = {
      kind: "transition",
      effect: "crossfade",
      progress: 0.02,
      from,
      to,
      endFade: 0,
    };

    expect(support.readPixel(frame, [0.02, 0.02])).toSatisfy((pixel: Rgb) => {
      // Early in the crossfade, the frame is overwhelmingly the ground colour mixed with a
      // sliver of red; nowhere near black.
      return !isColour(pixel, [0, 0, 0]);
    });
  });
});
