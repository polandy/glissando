import type { Size } from "../ken-burns";

/** A rectangular RGBA buffer, row-major, four bytes per pixel: the shape `ImageData` already
 * has, kept separate so this module stays pure and testable without a browser. */
export interface PixelBuffer {
  readonly data: Uint8ClampedArray<ArrayBuffer>;
  readonly width: number;
  readonly height: number;
}

/** Three box blurs in a row approximate a Gaussian closely enough for a card's focus cross-fade
 * (ADR-0032), and run the same way in every engine — unlike `CanvasRenderingContext2D.filter`,
 * which Safari/WebKit (a real PWA target) does not support. */
const BOX_BLUR_PASSES = 3;

/** A blur wider than this many pixels is computed on a raster scaled down until it is this wide:
 * its cost grows with the raster's area and the box width, and a blur's output has no detail a
 * linearly filtered upscale would lose. */
const WORKING_SIGMA_PX = 3;

/** Where to compute a blur of `sigma` pixels over a raster of `size`: the scaled-down size and
 * the sigma at that size. */
export interface BlurPlan {
  readonly size: Size;
  readonly sigma: number;
}

/** `size` and `sigma` scaled down so the blur runs at `WORKING_SIGMA_PX`, or unchanged when it is
 * already that narrow. */
export function downscaledBlurPlan(size: Size, sigma: number): BlurPlan {
  if (sigma <= WORKING_SIGMA_PX) {
    return { size: { width: size.width, height: size.height }, sigma };
  }
  const scale = WORKING_SIGMA_PX / sigma;
  return {
    size: { width: Math.ceil(size.width * scale), height: Math.ceil(size.height * scale) },
    sigma: WORKING_SIGMA_PX,
  };
}

/**
 * `pixels` blurred by a Gaussian of standard deviation `sigma` pixels, approximated by
 * `BOX_BLUR_PASSES` box blurs (the standard sum-of-boxes construction). Colour is blurred
 * premultiplied by alpha, so a fully transparent pixel's colour never bleeds into a visible one;
 * alpha is blurred on its own, which conserves its total up to edge clamping and rounding. Pure:
 * `pixels` is not modified, a new buffer is returned.
 */
export function gaussianBlur(pixels: PixelBuffer, sigma: number): PixelBuffer {
  const radius = boxRadiusFor(sigma);
  if (radius <= 0) {
    return {
      data: Uint8ClampedArray.from(pixels.data),
      width: pixels.width,
      height: pixels.height,
    };
  }
  let current = premultiply(pixels);
  for (let pass = 0; pass < BOX_BLUR_PASSES; pass++) {
    current = boxBlurPass(current, radius);
  }
  return unpremultiply(current);
}

/** The box width that, repeated `BOX_BLUR_PASSES` times, approximates a Gaussian of `sigma`:
 * `w ≈ sqrt((12·sigma²/n) + 1)`, the standard n-box construction. */
function boxRadiusFor(sigma: number): number {
  const width = Math.sqrt((12 * sigma * sigma) / BOX_BLUR_PASSES + 1);
  return Math.max(0, Math.round((width - 1) / 2));
}

function premultiply(pixels: PixelBuffer): PixelBuffer {
  const data = new Uint8ClampedArray(pixels.data.length);
  for (let index = 0; index < data.length; index += 4) {
    const alpha = (pixels.data[index + 3] ?? 0) / 255;
    data[index] = (pixels.data[index] ?? 0) * alpha;
    data[index + 1] = (pixels.data[index + 1] ?? 0) * alpha;
    data[index + 2] = (pixels.data[index + 2] ?? 0) * alpha;
    data[index + 3] = pixels.data[index + 3] ?? 0;
  }
  return { data, width: pixels.width, height: pixels.height };
}

function unpremultiply(pixels: PixelBuffer): PixelBuffer {
  const data = new Uint8ClampedArray(pixels.data.length);
  for (let index = 0; index < data.length; index += 4) {
    const alpha = pixels.data[index + 3] ?? 0;
    const scale = alpha > 0 ? 255 / alpha : 0;
    data[index] = (pixels.data[index] ?? 0) * scale;
    data[index + 1] = (pixels.data[index + 1] ?? 0) * scale;
    data[index + 2] = (pixels.data[index + 2] ?? 0) * scale;
    data[index + 3] = alpha;
  }
  return { data, width: pixels.width, height: pixels.height };
}

/** One box blur, horizontal then vertical, over all four channels (colour already premultiplied,
 * so this treats them alike); edges clamp to the nearest real pixel. */
function boxBlurPass(pixels: PixelBuffer, radius: number): PixelBuffer {
  return boxBlurVertical(boxBlurHorizontal(pixels, radius), radius);
}

function boxBlurHorizontal(pixels: PixelBuffer, radius: number): PixelBuffer {
  const { data, width, height } = pixels;
  const out = new Uint8ClampedArray(data.length);
  const windowWidth = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      for (let channel = 0; channel < 4; channel++) {
        let sum = 0;
        for (let offset = -radius; offset <= radius; offset++) {
          const sampleX = clamp(x + offset, 0, width - 1);
          sum += data[(row + sampleX) * 4 + channel] ?? 0;
        }
        out[(row + x) * 4 + channel] = sum / windowWidth;
      }
    }
  }
  return { data: out, width, height };
}

function boxBlurVertical(pixels: PixelBuffer, radius: number): PixelBuffer {
  const { data, width, height } = pixels;
  const out = new Uint8ClampedArray(data.length);
  const windowHeight = radius * 2 + 1;
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      for (let channel = 0; channel < 4; channel++) {
        let sum = 0;
        for (let offset = -radius; offset <= radius; offset++) {
          const sampleY = clamp(y + offset, 0, height - 1);
          sum += data[(sampleY * width + x) * 4 + channel] ?? 0;
        }
        out[(y * width + x) * 4 + channel] = sum / windowHeight;
      }
    }
  }
  return { data: out, width, height };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
