import { afterEach, describe, expect, it } from "vitest";
import type { BitmapPicture } from "../browser/bitmap-loader";
import type { Fonts } from "../fonts";
import type { CardVisual, GroundSlideLayer, PictureSlideLayer, RenderFrame } from "../ports";
import type { Card } from "../slideshow";
import {
  BLUE,
  solidBitmap,
  standingStill,
  viewportBox,
  RED,
  type Rgb,
} from "../testing/browser-pictures";
import { WebGlRenderer } from "./webgl-renderer";

const VIEWPORT = { width: 200, height: 200 };
const WHOLE_PICTURE = { zoom: 1, centerX: 0.5, centerY: 0.5 } as const;
/** `#101010`. */
const GROUND_COLOUR: Rgb = [16, 16, 16];
const GROUND_HEX = "#101010";
const COLOUR_TOLERANCE = 8;

let box: HTMLElement;
afterEach(() => box.remove());

/** Fonts the test lets load when it wants (`webgl-captions.browser.test.ts`'s pattern). */
class ControlledFonts implements Fonts {
  #resolve: () => void = () => undefined;
  readonly #loaded = new Promise<void>((resolve) => (this.#resolve = resolve));
  load(): Promise<unknown> {
    return this.#loaded;
  }
  finishLoading(): void {
    this.#resolve();
  }
}

function baseCard(overrides: Partial<Card> = {}): Card {
  return { title: "HELLO", style: "modern", position: "centre", ink: "light", ...overrides };
}

/** Text opacity 0 unless overridden, so a card irrelevant to the test draws nothing. */
function cardVisual(card: Card, overrides: Partial<CardVisual> = {}): CardVisual {
  return { card, textOpacity: 0, driftEm: 0, veilAmount: 0, ...overrides };
}

function groundLayer(card: CardVisual): GroundSlideLayer {
  return { kind: "ground", ground: GROUND_HEX, card };
}

function setUp({ fontsLoaded = true } = {}) {
  box = viewportBox(VIEWPORT);
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
  box.append(canvas);
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (gl === null) {
    throw new Error("this browser has no WebGL2");
  }
  const fonts = new ControlledFonts();
  const renderer = new WebGlRenderer(canvas, gl, () => undefined, { pixelRatio: () => 1, fonts });
  if (fontsLoaded) {
    fonts.finishLoading();
  }
  /** Reads one pixel straight after drawing, before the browser presents and clears the frame. */
  function readPixel(frame: RenderFrame<BitmapPicture>, [x, y]: readonly [number, number]): Rgb {
    renderer.render(frame);
    const pixel = new Uint8Array(4);
    gl?.readPixels(
      Math.floor(x * canvas.width),
      Math.floor((1 - y) * canvas.height),
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixel,
    );
    return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
  }
  /** Every pixel of the frame, as `[r, g, b, a, r, g, b, a, ...]`. */
  function readAllPixels(frame: RenderFrame<BitmapPicture>): Uint8Array {
    renderer.render(frame);
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl?.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels;
  }
  return { renderer, fonts, readPixel, readAllPixels };
}

function isColour(actual: Rgb, expected: Rgb): boolean {
  return actual.every(
    (channel, index) => Math.abs(channel - (expected[index] ?? 0)) <= COLOUR_TOLERANCE,
  );
}

/** True if every pixel is within tolerance of `ground`: nothing but the ground was drawn. */
function everyPixelIsGround(pixels: Uint8Array, ground: Rgb): boolean {
  for (let index = 0; index < pixels.length; index += 4) {
    const pixel: Rgb = [pixels[index] ?? 0, pixels[index + 1] ?? 0, pixels[index + 2] ?? 0];
    if (!isColour(pixel, ground)) {
      return false;
    }
  }
  return true;
}

function saturationSpread([red, green, blue]: Rgb): number {
  return Math.max(red, green, blue) - Math.min(red, green, blue);
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
      slide: groundLayer(cardVisual(baseCard(), { textOpacity: 1 })),
      endFade: 0,
    };

    expect(everyPixelIsGround(readAllPixels(frame), GROUND_COLOUR)).toBe(true);

    fonts.finishLoading();
    await renderer.cardFontLoaded("modern");

    expect(everyPixelIsGround(readAllPixels(frame), GROUND_COLOUR)).toBe(false);
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
