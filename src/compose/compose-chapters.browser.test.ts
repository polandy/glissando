import { afterEach, describe, expect, it } from "vitest";
import type { PictureFocus } from "../library/picture-focus";
import { DEFAULT_SLIDESHOW_TRANSITION } from "../library/own-timing";
import type { StoredPicture } from "../library/stored-slideshow";
import { canvasCardMeasure } from "../player/card-measure";
import { cardItemSlices } from "../player/card-item-layout";
import { CARD_STYLE_SPECS, layoutCard } from "../player/card-layout";
import { isGroundSlide, type KenBurns, type PictureSlide, type Slide } from "../player/slideshow";
import type { BitmapPicture } from "../player/browser/bitmap-loader";
import type { PictureSlideLayer, RenderFrame } from "../player/ports";
import {
  quadrantBitmap,
  solidBitmap,
  standingStill,
  BLUE,
  type Rgb,
} from "../player/testing/browser-pictures";
import {
  cardVisual,
  isColour,
  setUpCardRenderer,
  VIEWPORT,
  WHOLE_PICTURE,
} from "../player/webgl/testing/card-render-fixtures";
import { CHAPTER_SLIDE_MS, composeChapters, type ComposedChapter } from "./compose-chapters";
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

/**
 * A pan across the picture's diagonal, held at the anchor picture itself (ADR-0006), so it
 * travels with the picture wherever it plays — a jump to a different point of it moves the crop
 * a lot, not a little.
 */
const PANNING_KEN_BURNS: KenBurns = {
  from: { zoom: 1.4, centerX: 0.3, centerY: 0.3 },
  to: { zoom: 1.4, centerX: 0.7, centerY: 0.7 },
  easing: "linear",
};

function panningPicture(): StoredPicture {
  return { ...picture(), kenBurns: { from: PANNING_KEN_BURNS.from, to: PANNING_KEN_BURNS.to } };
}

/** The composed slides for one chapter before `panningPicture`'s own slide (Rule F): either the
 * anchor's own slide, carrying the chapter and running on, or — against the former composition,
 * which always inserted a dedicated card-only slide first — that slide followed by the anchor's. */
function composedWithChapter(): readonly Slide[] {
  const anchor: Slide = {
    image: { src: "pictures/p1.jpg", capturedAt: "2025-07-01T10:00:00Z" },
    durationMs: 5000,
    kenBurns: PANNING_KEN_BURNS,
  };
  const chapter: ComposedChapter = { anchorPictureId: "p1", title: "Lisbon", subtitle: "Day 2" };
  return composeChapters(
    [chapter],
    [panningPicture()],
    [anchor],
    sources,
    NO_FOCUS,
    DEFAULT_SLIDESHOW_TRANSITION,
  );
}

/** The picture slide and the local time within it that is showing at `elapsedMs` since the
 * composed slides' own start — the same walk the player's timeline does across a slide boundary. */
function pictureSlideAt(
  slides: readonly Slide[],
  elapsedMs: number,
): { readonly slide: PictureSlide; readonly slideTimeMs: number } {
  let remaining = elapsedMs;
  for (const [index, slide] of slides.entries()) {
    if (isGroundSlide(slide)) {
      throw new Error("expected a picture slide");
    }
    if (remaining < slide.durationMs || index === slides.length - 1) {
      return { slide, slideTimeMs: Math.min(remaining, slide.durationMs) };
    }
    remaining -= slide.durationMs;
  }
  throw new Error("composeChapters produced no slide");
}

describe("a chapter composed before its anchor picture, rendered across the hand-over", () => {
  it("keeps the picture's own framing continuous, not a jump to a different crop", async () => {
    const composed = composedWithChapter();
    // Both sample times are past the reveal (Rule F; CARD_REVEAL_MS ends by CHAPTER_SLIDE_MS),
    // so only the picture's own Ken Burns, not the veil or text, can account for a pixel
    // difference between them.
    const { readPixel, box: renderBox } = setUpCardRenderer();
    box = renderBox;
    const quadrants = await quadrantBitmap();

    function frameAt(elapsedMs: number): RenderFrame<BitmapPicture> {
      const { slide, slideTimeMs } = pictureSlideAt(composed, elapsedMs);
      const progress = Math.min(1, Math.max(0, slideTimeMs / slide.durationMs));
      const layer: PictureSlideLayer<BitmapPicture> = {
        kind: "picture",
        picture: quadrants,
        motion: { kenBurns: slide.kenBurns, progress },
      };
      return { kind: "slide", slide: layer, endFade: 0 };
    }

    const endOfChapter = readPixel(frameAt(CHAPTER_SLIDE_MS - 1), [0.5, 0.5]);
    const shortlyAfter = readPixel(frameAt(CHAPTER_SLIDE_MS + 200), [0.5, 0.5]);

    expect(isColour(shortlyAfter, endOfChapter)).toBe(true);
  });
});
