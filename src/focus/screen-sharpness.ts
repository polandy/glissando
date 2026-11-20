import { sharpness } from "../culling/sharpness";
import type { FocusBox, PictureFocus } from "../library/picture-focus";
import { greyFromRgba, type GreyImage } from "./grey-image";

/** The screen a picture's sharpness is judged on: Full HD, turned to the picture's orientation. */
const SCREEN = { longEdge: 1920, shortEdge: 1080 } as const;

/**
 * At or below this sharpness on screen a picture looks soft: about a sharp picture's score zoomed
 * twofold. Calibrated in `screen-sharpness.browser.test.ts` (ADR-0061).
 */
export const SOFT_ON_SCREEN_SHARPNESS = 20;

/** Zooming by z divides the score by about z to this power, measured in `screen-sharpness.browser.test.ts`. */
export const SHARPNESS_FALL_EXPONENT = 2;

/** A picture without a subject is judged by its sharpest tile of this grid, so a plain sky does not count. */
const TILES_PER_SIDE = 3;

/** The sharpness of the part of `grey` inside `box`, so a soft background does not count. */
export function subjectSharpness(grey: GreyImage, box: FocusBox): number {
  const left = Math.floor(box.x * grey.width);
  const top = Math.floor(box.y * grey.height);
  const right = Math.min(grey.width, Math.ceil((box.x + box.width) * grey.width));
  const bottom = Math.min(grey.height, Math.ceil((box.y + box.height) * grey.height));
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const pixels = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) {
    const from = (top + row) * grey.width + left;
    pixels.set(grey.pixels.subarray(from, from + width), row * width);
  }
  return sharpness({ width, height, pixels });
}

/** The size at which `picture` fills `SCREEN` at zoom 1, scaled up as the player would. */
export function screenSize(picture: { readonly width: number; readonly height: number }): {
  readonly width: number;
  readonly height: number;
} {
  const longEdge = Math.max(picture.width, picture.height);
  const shortEdge = Math.min(picture.width, picture.height);
  const scale = Math.max(SCREEN.longEdge / longEdge, SCREEN.shortEdge / shortEdge);
  return {
    width: Math.max(1, Math.round(picture.width * scale)),
    height: Math.max(1, Math.round(picture.height * scale)),
  };
}

/**
 * How sharp `focus`'s subject, or the whole picture without one, looks on screen: `display`
 * drawn at its `screenSize`, then measured inside the box.
 */
export async function screenSharpness(display: Blob, focus: PictureFocus): Promise<number> {
  const bitmap = await createImageBitmap(display);
  let grey: GreyImage;
  try {
    const { width, height } = screenSize(bitmap);
    const context = new OffscreenCanvas(width, height).getContext("2d");
    if (!context) throw new Error("This browser has no 2D canvas to measure sharpness in");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    grey = greyFromRgba(context.getImageData(0, 0, width, height).data, width, height);
  } finally {
    bitmap.close();
  }
  return focus.kind === "subject" ? subjectSharpness(grey, focus.box) : sharpestTile(grey);
}

/** The sharpness of `grey`'s sharpest tile. */
export function sharpestTile(grey: GreyImage): number {
  const side = 1 / TILES_PER_SIDE;
  let sharpest = 0;
  for (let row = 0; row < TILES_PER_SIDE; row++) {
    for (let column = 0; column < TILES_PER_SIDE; column++) {
      const box = { x: column * side, y: row * side, width: side, height: side };
      sharpest = Math.max(sharpest, subjectSharpness(grey, box));
    }
  }
  return sharpest;
}
