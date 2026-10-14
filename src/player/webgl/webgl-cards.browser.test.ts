import { afterEach, describe, expect, it } from "vitest";
import type { BitmapPicture } from "../browser/bitmap-loader";
import { CARD_STYLE_SPECS, layoutCard } from "../card-layout";
import { cardItemSlices } from "../card-item-layout";
import { canvasCardMeasure } from "../card-measure";
import type { PictureSlideLayer, RenderFrame } from "../ports";
import { BLUE, solidBitmap, standingStill, RED, type Rgb } from "../testing/browser-pictures";
import {
  baseCard,
  cardVisual,
  everyPixelIsGround,
  groundLayer,
  GROUND_COLOUR,
  isColour,
  maxBrightnessInColumns,
  saturationSpread,
  setUpCardRenderer,
  VIEWPORT,
  WHOLE_PICTURE,
} from "./testing/card-render-fixtures";

let box: HTMLElement;
afterEach(() => box.remove());

function setUp(options: { readonly fontsLoaded?: boolean } = {}) {
  const support = setUpCardRenderer(options);
  box = support.box;
  return support;
}

describe("WebGlRenderer ground slides", () => {
  it("fills a ground slide's corner with its own colour, not a picture's", () => {
    const { readPixel } = setUp();
    const frame: RenderFrame<BitmapPicture> = {
      kind: "slide",
      slide: groundLayer(cardVisual(baseCard())),
      endFade: 0,
    };

    expect(readPixel(frame, [0.02, 0.02])).toSatisfy((pixel: Rgb) =>
      isColour(pixel, GROUND_COLOUR),
    );
  });

  it("mixes a ground slide and a picture slide halfway through a crossfade", async () => {
    const { readPixel } = setUp();
    const picture = await solidBitmap(BLUE);
    const to: PictureSlideLayer<BitmapPicture> = {
      kind: "picture",
      picture,
      motion: standingStill(WHOLE_PICTURE),
    };
    const frame: RenderFrame<BitmapPicture> = {
      kind: "transition",
      effect: "crossfade",
      progress: 0.5,
      from: groundLayer(cardVisual(baseCard())),
      to,
      endFade: 0,
    };
    const expected: Rgb = [
      GROUND_COLOUR[0] / 2,
      GROUND_COLOUR[1] / 2,
      (GROUND_COLOUR[2] + 255) / 2,
    ];

    expect(readPixel(frame, [0.5, 0.5])).toSatisfy((pixel: Rgb) => isColour(pixel, expected));
  });
});

describe("WebGlRenderer title cards", () => {
  it("draws nothing for a card until its style's fonts have loaded, then draws its text", async () => {
    const { renderer, fonts, readAllPixels } = setUp({ fontsLoaded: false });
    const frame: RenderFrame<BitmapPicture> = {
      kind: "slide",
      slide: groundLayer(cardVisual(baseCard(), { textOpacity: 1, slideTimeMs: 800 })),
      endFade: 0,
    };

    expect(everyPixelIsGround(readAllPixels(frame), GROUND_COLOUR)).toBe(true);

    fonts.finishLoading();
    await renderer.cardFontLoaded("modern");

    expect(everyPixelIsGround(readAllPixels(frame), GROUND_COLOUR)).toBe(false);
  });

  it("under words, mid-enter draws the first word more opaque than the last", async () => {
    const { renderer, readAllPixels } = setUp();
    await renderer.cardFontLoaded("modern");
    const card = baseCard({ title: "Summer Lake", entrance: "words" });
    const frame: RenderFrame<BitmapPicture> = {
      kind: "slide",
      slide: groundLayer(cardVisual(card, { textOpacity: 1, slideTimeMs: 300 })),
      endFade: 0,
    };
    // The two words' own slices, to split the canvas between them rather than down the middle,
    // which would let the first word's own trailing pixels leak into the second word's half.
    const measureTitle = canvasCardMeasure(CARD_STYLE_SPECS.modern.title, VIEWPORT);
    const measureSubtitle = canvasCardMeasure(CARD_STYLE_SPECS.modern.subtitle, VIEWPORT);
    const layout = layoutCard(card, VIEWPORT, measureTitle, measureSubtitle);
    const [firstSlice, lastSlice] = cardItemSlices(
      card,
      layout,
      VIEWPORT,
      measureTitle,
      measureSubtitle,
    );
    if (firstSlice === undefined || lastSlice === undefined) {
      throw new Error("expected two word slices for a two-word title");
    }
    const split = (firstSlice.x + firstSlice.width + lastSlice.x) / 2;

    const pixels = readAllPixels(frame);
    const firstWord = maxBrightnessInColumns(pixels, VIEWPORT.width, 0, split);
    const lastWord = maxBrightnessInColumns(pixels, VIEWPORT.width, split, VIEWPORT.width);

    expect(firstWord).toBeGreaterThan(lastWord);
  });
});

describe("WebGlRenderer veils", () => {
  it("leaves the picture unchanged at amount 0, and less saturated at amount 1", async () => {
    const { readPixel } = setUp();
    const picture = await solidBitmap(RED);
    const motion = standingStill(WHOLE_PICTURE);
    const card = baseCard({ veil: { amount: 1, tint: "#2A2340" } });
    function frame(veilAmount: number): RenderFrame<BitmapPicture> {
      const slide: PictureSlideLayer<BitmapPicture> = {
        kind: "picture",
        picture,
        motion,
        card: cardVisual(card, { veilAmount }),
      };
      return { kind: "slide", slide, endFade: 0 };
    }

    const unveiled = readPixel(frame(0), [0.5, 0.5]);
    const veiled = readPixel(frame(1), [0.5, 0.5]);

    expect(unveiled).toEqual([...RED]);
    expect(saturationSpread(veiled)).toBeLessThan(saturationSpread(unveiled));
  });
});

describe("WebGlRenderer end fade", () => {
  it("mixes the whole frame to black at endFade 1, leaving it unchanged at 0", () => {
    const { readPixel } = setUp();
    const layer = groundLayer(cardVisual(baseCard()));

    expect(readPixel({ kind: "slide", slide: layer, endFade: 0 }, [0.5, 0.5])).toSatisfy(
      (pixel: Rgb) => isColour(pixel, GROUND_COLOUR),
    );
    expect(readPixel({ kind: "slide", slide: layer, endFade: 1 }, [0.5, 0.5])).toEqual([0, 0, 0]);
  });
});
