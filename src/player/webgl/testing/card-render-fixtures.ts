import type { BitmapPicture } from "../../browser/bitmap-loader";
import type { Fonts } from "../../fonts";
import type { CardVisual, GroundSlideLayer, RenderFrame } from "../../ports";
import type { Card } from "../../slideshow";
import { viewportBox, type Rgb } from "../../testing/browser-pictures";
import { WebGlRenderer } from "../webgl-renderer";

/** Shared by `webgl-cards.browser.test.ts` and `webgl-card-transitions.browser.test.ts`: a
 * ground slide's stage, its card and a way to read back what the renderer drew. */
export const VIEWPORT = { width: 200, height: 200 };
export const WHOLE_PICTURE = { zoom: 1, centerX: 0.5, centerY: 0.5 } as const;
/** `#101010`. */
export const GROUND_COLOUR: Rgb = [16, 16, 16];
export const GROUND_HEX = "#101010";
export const COLOUR_TOLERANCE = 8;

/** Fonts the test lets load when it wants (`webgl-captions.browser.test.ts`'s pattern). */
export class ControlledFonts implements Fonts {
  #resolve: () => void = () => undefined;
  readonly #loaded = new Promise<void>((resolve) => (this.#resolve = resolve));
  load(): Promise<unknown> {
    return this.#loaded;
  }
  finishLoading(): void {
    this.#resolve();
  }
}

export function baseCard(overrides: Partial<Card> = {}): Card {
  return {
    title: "HELLO",
    style: "modern",
    position: "centre",
    ink: "light",
    entrance: "rise",
    ...overrides,
  };
}

/** Text opacity 0 unless overridden, so a card irrelevant to the test draws nothing. */
export function cardVisual(card: Card, overrides: Partial<CardVisual> = {}): CardVisual {
  return {
    card,
    textOpacity: 0,
    driftEm: 0,
    veilAmount: 0,
    slideTimeMs: 0,
    reducedMotion: false,
    ...overrides,
  };
}

export function groundLayer(card: CardVisual): GroundSlideLayer {
  return { kind: "ground", ground: GROUND_HEX, card };
}

export function setUpCardRenderer({ fontsLoaded = true } = {}): {
  readonly renderer: WebGlRenderer;
  readonly fonts: ControlledFonts;
  readonly box: HTMLElement;
  readPixel(frame: RenderFrame<BitmapPicture>, point: readonly [number, number]): Rgb;
  readAllPixels(frame: RenderFrame<BitmapPicture>): Uint8Array;
} {
  const box = viewportBox(VIEWPORT);
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
  box.append(canvas);
  const context = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (context === null) {
    throw new Error("this browser has no WebGL2");
  }
  // A non-null-typed alias: TypeScript does not carry the null check above into the nested
  // functions below, which close over this variable rather than being called immediately.
  const gl: WebGL2RenderingContext = context;
  const fonts = new ControlledFonts();
  const renderer = new WebGlRenderer(canvas, gl, () => undefined, { pixelRatio: () => 1, fonts });
  if (fontsLoaded) {
    fonts.finishLoading();
  }
  /** Reads one pixel straight after drawing, before the browser presents and clears the frame. */
  function readPixel(frame: RenderFrame<BitmapPicture>, [x, y]: readonly [number, number]): Rgb {
    renderer.render(frame);
    const pixel = new Uint8Array(4);
    gl.readPixels(
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
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels;
  }
  return { renderer, fonts, box, readPixel, readAllPixels };
}

export function isColour(actual: Rgb, expected: Rgb): boolean {
  return actual.every(
    (channel, index) => Math.abs(channel - (expected[index] ?? 0)) <= COLOUR_TOLERANCE,
  );
}

/** True if every pixel is within tolerance of `ground`: nothing but the ground was drawn. */
export function everyPixelIsGround(pixels: Uint8Array, ground: Rgb): boolean {
  for (let index = 0; index < pixels.length; index += 4) {
    const pixel: Rgb = [pixels[index] ?? 0, pixels[index + 1] ?? 0, pixels[index + 2] ?? 0];
    if (!isColour(pixel, ground)) {
      return false;
    }
  }
  return true;
}

export function saturationSpread([red, green, blue]: Rgb): number {
  return Math.max(red, green, blue) - Math.min(red, green, blue);
}

/** The brightest pixel within columns `[x0, x1)`, summed over its three channels. */
export function maxBrightnessInColumns(
  pixels: Uint8Array,
  width: number,
  x0: number,
  x1: number,
): number {
  let max = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const x = (index / 4) % width;
    if (x < x0 || x >= x1) {
      continue;
    }
    const brightness = (pixels[index] ?? 0) + (pixels[index + 1] ?? 0) + (pixels[index + 2] ?? 0);
    if (brightness > max) {
      max = brightness;
    }
  }
  return max;
}
