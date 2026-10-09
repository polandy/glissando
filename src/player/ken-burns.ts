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

/** A Ken Burns motion `progress` (linear, 0..1) of its way. */
export interface KenBurnsAt {
  readonly kenBurns: KenBurns;
  readonly progress: number;
}

/**
 * The part of the picture that fills the viewport `progress` of the way through a Ken Burns
 * motion: from the start frame to the end frame, each first held inside the picture by its edges.
 * No edge is reached on the way between, so none bends the motion: the centre runs straight
 * between the end frames' centres while the width (cover / zoom) stays at or below the straight
 * line between their widths, so a crop that fits at both ends fits all the way.
 */
export function cropAt({ kenBurns, progress }: KenBurnsAt, picture: Size, viewport: Size): Rect {
  const from = heldInside(kenBurns.from, picture, viewport);
  const to = heldInside(kenBurns.to, picture, viewport);
  return cropRect(framingAt({ ...kenBurns, from, to }, progress), picture, viewport);
}

/** `framing` centred on its crop, i.e. moved as far as the picture's edges push it. */
function heldInside(framing: Framing, picture: Size, viewport: Size): Framing {
  const crop = cropRect(framing, picture, viewport);
  return {
    zoom: framing.zoom,
    centerX: crop.x + crop.width / 2,
    centerY: crop.y + crop.height / 2,
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
