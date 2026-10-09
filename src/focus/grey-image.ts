/** An 8-bit luminance picture, row by row from the top left. */
export interface GreyImage {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

const RGBA_CHANNELS = 4;
// The integer weights pico's own examples use, close to Rec. 601 luma at a fraction of the cost.
const RED_WEIGHT = 2;
const GREEN_WEIGHT = 7;
const BLUE_WEIGHT = 1;
const WEIGHT_SUM = RED_WEIGHT + GREEN_WEIGHT + BLUE_WEIGHT;

/** Converts canvas RGBA data (as `getImageData` returns it) to luminance; alpha is ignored. */
export function greyFromRgba(rgba: Uint8ClampedArray, width: number, height: number): GreyImage {
  const pixelCount = width * height;
  if (rgba.length !== pixelCount * RGBA_CHANNELS) {
    throw new RangeError(
      `RGBA data holds ${rgba.length} bytes; a ${width} × ${height} picture needs ${pixelCount * RGBA_CHANNELS}`,
    );
  }
  const pixels = new Uint8Array(pixelCount);
  for (let pixel = 0, byte = 0; pixel < pixelCount; pixel++, byte += RGBA_CHANNELS) {
    const red = rgba[byte] ?? 0;
    const green = rgba[byte + 1] ?? 0;
    const blue = rgba[byte + 2] ?? 0;
    // A Uint8Array store truncates, which is the rounding down pico expects.
    pixels[pixel] = (RED_WEIGHT * red + GREEN_WEIGHT * green + BLUE_WEIGHT * blue) / WEIGHT_SUM;
  }
  return { width, height, pixels };
}
