import type { Rect } from "../../player";
import type { PicturePoint } from "./frame-geometry";
import { FRAME_KEYS, type FrameKey } from "./frame-keys";

/** How far from a frame's border, in CSS pixels, a tap still counts as on it: a fingertip. */
export const TAP_TOLERANCE_PX = 24;

/** A distance per axis in picture coordinates (0..1 of the picture's width and height). */
export interface PictureDistance {
  readonly x: number;
  readonly y: number;
}

/**
 * The frame a tap at `point` picks, or null when the tap is ambiguous. A tap picks the inactive
 * frame where it lies inside that one alone; otherwise the one frame whose border lies within
 * `tolerance` of it, unless the other frame's border does too. Point, rects and tolerance in
 * picture coordinates; edges count as inside.
 */
export function tappedFrame(
  point: PicturePoint,
  rects: Readonly<Record<FrameKey, Rect>>,
  active: FrameKey,
  tolerance: PictureDistance,
): FrameKey | null {
  const inside = FRAME_KEYS.filter((key) => contains(rects[key], point));
  if (inside.length === 1 && inside[0] !== active) {
    return inside[0] ?? null;
  }
  const near = FRAME_KEYS.filter((key) => borderDistance(rects[key], point, tolerance) <= 1);
  return near.length === 1 ? (near[0] ?? null) : null;
}

function contains(rect: Rect, point: PicturePoint): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** The distance from `point` to the rect's border, in units of `tolerance` per axis. */
function borderDistance(rect: Rect, point: PicturePoint, tolerance: PictureDistance): number {
  const left = (point.x - rect.x) / tolerance.x;
  const right = (rect.x + rect.width - point.x) / tolerance.x;
  const top = (point.y - rect.y) / tolerance.y;
  const bottom = (rect.y + rect.height - point.y) / tolerance.y;
  if (contains(rect, point)) {
    return Math.min(left, right, top, bottom);
  }
  return Math.hypot(Math.max(-left, 0, -right), Math.max(-top, 0, -bottom));
}
