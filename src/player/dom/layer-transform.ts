import type { Rect, Size } from "../ken-burns";

export interface PixelRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * CSS transform (origin top left) that makes a picture element at its natural size show
 * exactly `crop` across `target`: the whole viewport for a single picture, or a pair's or a
 * blurred fill's wrapper for its own local size (ADR-0028).
 */
export function layerTransform(crop: Rect, picture: Size, target: Size): string {
  const scale = target.width / (crop.width * picture.width);
  const left = -crop.x * picture.width * scale;
  const top = -crop.y * picture.height * scale;
  return `translate(${pixels(left)}, ${pixels(top)}) scale(${scale})`;
}

/** `rect` (0..1, a share of `viewport`) in CSS pixels. */
export function toPixelRect(rect: Rect, viewport: Size): PixelRect {
  return {
    left: rect.x * viewport.width,
    top: rect.y * viewport.height,
    width: rect.width * viewport.width,
    height: rect.height * viewport.height,
  };
}

/** Writes -0 as 0. */
function pixels(value: number): string {
  return `${value === 0 ? 0 : value}px`;
}
