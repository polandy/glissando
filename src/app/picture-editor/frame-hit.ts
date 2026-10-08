import type { Rect } from "../../player";
import type { PicturePoint } from "./frame-geometry";
import { FRAME_KEYS, type FrameKey } from "./frame-keys";

/** Which frame a point on the picture picks: one alone, both where they overlap, or none. */
export type FrameHit = FrameKey | "ambiguous" | "none";

/** `point` and the frames' rects in picture coordinates (0..1); edges count as inside. */
export function frameAt(point: PicturePoint, rects: Readonly<Record<FrameKey, Rect>>): FrameHit {
  const inside = FRAME_KEYS.filter((key) => contains(rects[key], point));
  if (inside.length > 1) {
    return "ambiguous";
  }
  return inside[0] ?? "none";
}

function contains(rect: Rect, point: PicturePoint): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}
