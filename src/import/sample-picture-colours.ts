import { PICTURE_COLOURS_SAMPLE_SIDE, type RgbPixel } from "../library/picture-colours";
import { drawScaled, fitWithin, type Bound, type Size } from "./downscale";
import { UnreadablePictureError } from "./unreadable-picture";

/**
 * Reads a picture's pixels off its stored, downscaled rendition, sampled down further to at most
 * `PICTURE_COLOURS_SAMPLE_SIDE` per edge: the browser I/O edge `pictureColours` is sampled from.
 */

const SAMPLE_BOUND: Bound = {
  longEdge: PICTURE_COLOURS_SAMPLE_SIDE,
  shortEdge: PICTURE_COLOURS_SAMPLE_SIDE,
};

export async function samplePictureColourPixels(blob: Blob): Promise<readonly RgbPixel[]> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch (error) {
    throw new UnreadablePictureError("picture", "decode", { cause: error });
  }
  try {
    const size = fitWithin(bitmap, SAMPLE_BOUND);
    return pixelsOf(imageDataOf(bitmap, size));
  } finally {
    bitmap.close();
  }
}

function imageDataOf(bitmap: ImageBitmap, size: Size): ImageData {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(size.width, size.height);
    const context = canvas.getContext("2d");
    drawScaled(context, bitmap, size);
    return nonNullContext(context).getImageData(0, 0, size.width, size.height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  drawScaled(context, bitmap, size);
  return nonNullContext(context).getImageData(0, 0, size.width, size.height);
}

/** `drawScaled` already throws when `context` is null; this only restates that for the type. */
function nonNullContext<Context>(context: Context | null): Context {
  if (context === null) {
    throw new Error("this browser offers no 2D canvas to sample a picture's colours with");
  }
  return context;
}

function pixelsOf(data: ImageData): readonly RgbPixel[] {
  const pixels: RgbPixel[] = [];
  for (let index = 0; index < data.data.length; index += 4) {
    pixels.push({
      r: data.data[index] ?? 0,
      g: data.data[index + 1] ?? 0,
      b: data.data[index + 2] ?? 0,
    });
  }
  return pixels;
}
