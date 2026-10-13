import type { Rect } from "../ken-burns";
import type { SlideLayout } from "../slide-layout";

/**
 * The shader's layout case per `SlideLayout.kind` (the source of the `LAYOUT_*` consts in
 * `transition-shaders.ts`): a stacked pair gets the same code as a side-by-side one, because
 * `layerUniformRects` already places the halves where the rects say to.
 */
export const LAYOUT_CODE: Readonly<Record<SlideLayout["kind"], number>> = {
  cover: 0,
  "blurred-fill": 1,
  "pair-across": 2,
  "pair-stacked": 2,
};

const ZERO_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

export interface LayerUniformRects {
  /** Picture-space crop: cover crop, a blurred fill's backdrop, or a pair's first half. */
  readonly crop: Rect;
  /** Picture-space crop: unused for cover, a blurred fill's front picture, or a pair's second half. */
  readonly secondCrop: Rect;
  /** Screen-space rect, top-left origin: unused for cover, a blurred fill's front, or a pair's first half. */
  readonly rect: Rect;
  /** Screen-space rect, top-left origin: unused except a pair's second half. */
  readonly rect2: Rect;
}

/** The uniforms a layer's `SlideLayout` binds in the shader. */
export function layerUniformRects(layout: SlideLayout): LayerUniformRects {
  switch (layout.kind) {
    case "cover":
      return { crop: layout.crop, secondCrop: ZERO_RECT, rect: ZERO_RECT, rect2: ZERO_RECT };
    case "blurred-fill":
      return {
        crop: layout.backdropCrop,
        secondCrop: layout.frontCrop,
        rect: layout.frontRect,
        rect2: ZERO_RECT,
      };
    case "pair-across":
    case "pair-stacked":
      return {
        crop: layout.firstCrop,
        secondCrop: layout.secondCrop,
        rect: layout.firstRect,
        rect2: layout.secondRect,
      };
  }
}

/**
 * `rect` (top-left origin, as `slide-layout.ts` and the DOM renderer use) converted to the
 * fragment shader's screen space, which runs bottom-left origin (see `transition-shaders.ts`).
 */
export function glScreenRect(rect: Rect): Rect {
  return { x: rect.x, y: 1 - rect.y - rect.height, width: rect.width, height: rect.height };
}
