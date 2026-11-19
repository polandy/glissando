import { BLURRY_SHARPNESS_FLOOR } from "../culling/cull";
import { sharpness } from "../culling/sharpness";
import type { GreyImage } from "../focus/grey-image";
import type { FocusBox } from "../library/picture-focus";
import { SMALLEST_ZOOM_TRAVEL } from "./auto-ken-burns";

/** Magnifying by z stretches every edge z-fold, so the Laplacian shrinks by z² and its variance by z⁴. */
const SHARPNESS_FALL_EXPONENT = 4;

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

/**
 * The largest Ken Burns zoom at which a picture of this sharpness, measured at its size on screen
 * at zoom 1, still stays above the cull's blurry floor; never below `SMALLEST_ZOOM_TRAVEL`.
 */
export function maxZoomForSharpness(score: number): number {
  if (!Number.isFinite(score)) {
    throw new RangeError(`sharpness must be a finite number, got ${score}`);
  }
  const zoomToFloor =
    (Math.max(0, score) / BLURRY_SHARPNESS_FLOOR) ** (1 / SHARPNESS_FALL_EXPONENT);
  return Math.max(SMALLEST_ZOOM_TRAVEL, zoomToFloor);
}
