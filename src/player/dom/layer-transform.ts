import type { Rect, Size } from "../ken-burns";

/**
 * CSS transform (origin top left) that makes a picture element at its natural size show
 * exactly `crop` across the viewport.
 */
export function layerTransform(crop: Rect, picture: Size, viewport: Size): string {
  const scale = viewport.width / (crop.width * picture.width);
  const left = -crop.x * picture.width * scale;
  const top = -crop.y * picture.height * scale;
  return `translate(${pixels(left)}, ${pixels(top)}) scale(${scale})`;
}

/** Writes -0 as 0. */
function pixels(value: number): string {
  return `${value === 0 ? 0 : value}px`;
}
