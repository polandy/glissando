import { afterEach, describe, expect, it } from "vitest";
import type { PictureFocus } from "../library/picture-focus";
import { DEFAULT_SLIDESHOW_TRANSITION } from "../library/own-timing";
import type { StoredPicture } from "../library/stored-slideshow";
import { canvasCardMeasure } from "../player/card-measure";
import { cardItemSlices } from "../player/card-item-layout";
import { CARD_STYLE_SPECS, layoutCard } from "../player/card-layout";
import { isGroundSlide, type PictureSlide, type Slide } from "../player/slideshow";
import type { BitmapPicture } from "../player/browser/bitmap-loader";
import type { PictureSlideLayer, RenderFrame } from "../player/ports";
import { solidBitmap, standingStill, BLUE, type Rgb } from "../player/testing/browser-pictures";
import {
  cardVisual,
  setUpCardRenderer,
  VIEWPORT,
  WHOLE_PICTURE,
} from "../player/webgl/testing/card-render-fixtures";
import { composeChapters, type ComposedChapter } from "./compose-chapters";
import type { PictureSource } from "./card-slide";

/**
 * Rule F (`TRIP_CHAPTERS.md`), proved pixel-for-pixel: the card `compose-chapters.ts` builds
 * draws a lower-third text over a darkened picture, through the ordinary WebGL card renderer —
 * the player itself carries no chapter logic (`compose-chapters.test.ts` covers the card's
 * shape; this covers what actually reaches the screen). The picture is a generated solid
 * colour, never a real photo.
 */

let box: HTMLElement;
afterEach(() => box.remove());

function picture(): StoredPicture {
  return {
    id: "p1",
    capturedAt: "2025-07-01T10:00:00Z",
    width: 400,
    height: 300,
    fileName: "p1.jpg",
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

function plainSlide(pictureId: string): Slide {
  return {
    image: { src: `pictures/${pictureId}.jpg`, capturedAt: "2025-07-01T10:00:00Z" },
    durationMs: 5000,
    kenBurns: { from: WHOLE_PICTURE, to: WHOLE_PICTURE, easing: "linear" },
  };
}

const sources: PictureSource = { picture: (id) => `pictures/${id}.jpg` };
const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();

/** The one inserted chapter slide, composed exactly as the player receives it. */
function chapterSlide(): PictureSlide {
  const chapter: ComposedChapter = { anchorPictureId: "p1", title: "Lisbon", subtitle: "Day 2" };
  const [composed] = composeChapters(
    [chapter],
    [picture()],
    [plainSlide("p1")],
    sources,
    NO_FOCUS,
    DEFAULT_SLIDESHOW_TRANSITION,
  );
  if (composed === undefined || isGroundSlide(composed)) {
    throw new Error("expected the inserted chapter to be a picture slide");
  }
  return composed;
}

function brightnessOf([red, green, blue]: Rgb): number {
  return red + green + blue;
}

/**
 * The brightest pixel within `box` (in canvas pixels, top-down like `cardItemSlices`' output —
 * not `readPixel`'s point fractions). `readAllPixels` follows WebGL's bottom-up row order, so
 * each buffer row is flipped before it is tested against `box`.
 */
function maxBrightnessInBox(
  pixels: Uint8Array,
  canvasWidth: number,
  box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): number {
  const canvasHeight = pixels.length / 4 / canvasWidth;
  let max = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const x = (index / 4) % canvasWidth;
    const bufferRow = Math.floor(index / 4 / canvasWidth);
    const y = canvasHeight - 1 - bufferRow;
    if (x < box.x || x >= box.x + box.width || y < box.y || y >= box.y + box.height) {
      continue;
    }
    const brightness = (pixels[index] ?? 0) + (pixels[index + 1] ?? 0) + (pixels[index + 2] ?? 0);
    if (brightness > max) {
      max = brightness;
    }
  }
  return max;
}

describe("a composed chapter slide, rendered", () => {
  it("darkens the picture and draws its text in the lower third", async () => {
    const slide = chapterSlide();
    if (slide.card === undefined || slide.card.veil === undefined) {
      throw new Error("expected the chapter's card to carry a veil");
    }
    const card = slide.card;
    const veil = slide.card.veil;
    const { renderer, readPixel, readAllPixels, box: renderBox } = setUpCardRenderer();
    box = renderBox;
    await renderer.cardFontLoaded(card.style);
    const picturePixel = await solidBitmap(BLUE);
    const motion = standingStill(WHOLE_PICTURE);
    function frame(textOpacity: number, veilAmount: number): RenderFrame<BitmapPicture> {
      const layer: PictureSlideLayer<BitmapPicture> = {
        kind: "picture",
        picture: picturePixel,
        motion,
        card: cardVisual(card, { textOpacity, veilAmount, slideTimeMs: 1000 }),
      };
      return { kind: "slide", slide: layer, endFade: 0 };
    }

    // The picture is darkened: a point clear of the text (near the top) dims once the veil is on.
    const bare = readPixel(frame(0, 0), [0.5, 0.05]);
    const veiled = readPixel(frame(0, veil.amount), [0.5, 0.05]);
    expect(brightnessOf(veiled)).toBeLessThan(brightnessOf(bare));

    // The card's own text box sits in the lower third — where the text then has to appear.
    const measureTitle = canvasCardMeasure(CARD_STYLE_SPECS[card.style].title, VIEWPORT);
    const measureSubtitle = canvasCardMeasure(CARD_STYLE_SPECS[card.style].subtitle, VIEWPORT);
    const layout = layoutCard(card, VIEWPORT, measureTitle, measureSubtitle);
    const [slice] = cardItemSlices(card, layout, VIEWPORT, measureTitle, measureSubtitle);
    if (slice === undefined) {
      throw new Error("expected one whole-text slice for a slow-fade entrance");
    }
    expect(slice.y / VIEWPORT.height).toBeGreaterThan(2 / 3);

    // Within that box, drawing the text makes it brighter than the plain veiled picture alone.
    const veiledPixels = readAllPixels(frame(0, veil.amount));
    const textPixels = readAllPixels(frame(1, veil.amount));
    const veiledBrightness = maxBrightnessInBox(veiledPixels, VIEWPORT.width, slice);
    const textBrightness = maxBrightnessInBox(textPixels, VIEWPORT.width, slice);
    expect(textBrightness).toBeGreaterThan(veiledBrightness);
  });
});
