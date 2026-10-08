import { ease } from "./easing";
import type { Framing, KenBurns } from "./slideshow";

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** A part of a picture in picture coordinates (0..1, origin top left). */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The framing `progress` (linear, 0..1) of the way from → to, eased. */
export function framingAt(kenBurns: KenBurns, progress: number): Framing {
  const eased = ease(kenBurns.easing, progress);
  const lerp = (from: number, to: number) => from + (to - from) * eased;
  return {
    zoom: lerp(kenBurns.from.zoom, kenBurns.to.zoom),
    centerX: lerp(kenBurns.from.centerX, kenBurns.to.centerX),
    centerY: lerp(kenBurns.from.centerY, kenBurns.to.centerY),
  };
}

/**
 * The part of the picture that fills the viewport: crop-to-fit, shrunk by the zoom, moved to
 * the centre as far as the picture's edges allow.
 */
export function cropRect(framing: Framing, picture: Size, viewport: Size): Rect {
  const pictureAspect = picture.width / picture.height;
  const viewportAspect = viewport.width / viewport.height;
  const coverWidth = pictureAspect > viewportAspect ? viewportAspect / pictureAspect : 1;
  const coverHeight = pictureAspect > viewportAspect ? 1 : pictureAspect / viewportAspect;
  const width = coverWidth / framing.zoom;
  const height = coverHeight / framing.zoom;
  return {
    x: clamp(framing.centerX - width / 2, 0, 1 - width),
    y: clamp(framing.centerY - height / 2, 0, 1 - height),
    width,
    height,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
