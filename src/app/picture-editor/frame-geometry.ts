import { MAX_OWN_KEN_BURNS_ZOOM } from "../../library/own-ken-burns";
import { cropRect, MIN_KEN_BURNS_ZOOM, type Framing, type Rect, type Size } from "../../player";

/**
 * Where the picture editor's frames sit on the picture. A frame is exactly what the player crops
 * for a 16:9 screen (`cropRect`), so the editor and the player share one geometry.
 */

/** The editor frames for a 16:9 screen, the shape of a television and of the preview. */
export const EDITOR_SCREEN: Size = { width: 16, height: 9 };

/** Arrow keys move the frame by this share of the picture; with Shift by the larger one. */
const KEY_MOVE_STEP = 0.01;
const KEY_MOVE_STEP_LARGE = 0.05;
/** + and − change the zoom by this much. */
const KEY_ZOOM_STEP = 0.05;
/** How strongly one unit of wheel travel zooms; exponential, so in and out feel the same. */
const WHEEL_ZOOM_RATE = 0.0015;

/** A frame corner: north/south, west/east. */
export const CORNERS = ["nw", "ne", "sw", "se"] as const;
export type Corner = (typeof CORNERS)[number];

/** A point on the picture in picture coordinates (0..1, origin top left). */
export interface PicturePoint {
  readonly x: number;
  readonly y: number;
}

export function frameRect(framing: Framing, picture: Size): Rect {
  return cropRect(framing, picture, EDITOR_SCREEN);
}

/** A frame's place on the picture as CSS, in percent of the picture's box. */
export function frameStyle(framing: Framing, picture: Size): string {
  const { x, y, width, height } = frameRect(framing, picture);
  const percent = (value: number) => `${value * 100}%`;
  return `left:${percent(x)};top:${percent(y)};width:${percent(width)};height:${percent(height)}`;
}

/** The zoom within range and the centre moved so far that the frame lies inside the picture. */
export function fittedFraming(framing: Framing, picture: Size): Framing {
  const zoom = clamp(framing.zoom, MIN_KEN_BURNS_ZOOM, MAX_OWN_KEN_BURNS_ZOOM);
  const { x, y, width, height } = frameRect({ ...framing, zoom }, picture);
  return { zoom, centerX: x + width / 2, centerY: y + height / 2 };
}

export function movedFraming(framing: Framing, dx: number, dy: number, picture: Size): Framing {
  return fittedFraming(
    { ...framing, centerX: framing.centerX + dx, centerY: framing.centerY + dy },
    picture,
  );
}

export function zoomedFraming(framing: Framing, zoom: number, picture: Size): Framing {
  return fittedFraming({ ...framing, zoom }, picture);
}

/** `deltaY` as a wheel event reports it: positive rolls towards the user, which zooms out. */
export function wheelZoomedFraming(framing: Framing, deltaY: number, picture: Size): Framing {
  return zoomedFraming(framing, framing.zoom * Math.exp(-deltaY * WHEEL_ZOOM_RATE), picture);
}

/**
 * A corner of `start`'s frame dragged to `pointer`: the opposite corner stays put and the frame
 * keeps its shape, sized by the larger of the two drag directions.
 */
export function resizedFraming(
  start: Framing,
  corner: Corner,
  pointer: PicturePoint,
  picture: Size,
): Framing {
  const startRect = frameRect(start, picture);
  const full = frameRect({ zoom: MIN_KEN_BURNS_ZOOM, centerX: 0.5, centerY: 0.5 }, picture);
  const towardsEast = corner.endsWith("e") ? 1 : -1;
  const towardsSouth = corner.startsWith("s") ? 1 : -1;
  const anchorX = towardsEast > 0 ? startRect.x : startRect.x + startRect.width;
  const anchorY = towardsSouth > 0 ? startRect.y : startRect.y + startRect.height;
  const width = Math.max(
    Math.abs(pointer.x - anchorX),
    Math.abs(pointer.y - anchorY) * (full.width / full.height),
  );
  const zoom = clamp(full.width / width, MIN_KEN_BURNS_ZOOM, MAX_OWN_KEN_BURNS_ZOOM);
  const size = frameRect({ zoom, centerX: 0.5, centerY: 0.5 }, picture);
  return fittedFraming(
    {
      zoom,
      centerX: anchorX + (towardsEast * size.width) / 2,
      centerY: anchorY + (towardsSouth * size.height) / 2,
    },
    picture,
  );
}

/** The framing a key changes `framing` to on the focused frame; null for a key it ignores. */
export function framingForKey(
  framing: Framing,
  key: string,
  shift: boolean,
  picture: Size,
): Framing | null {
  const step = shift ? KEY_MOVE_STEP_LARGE : KEY_MOVE_STEP;
  switch (key) {
    case "ArrowLeft":
      return movedFraming(framing, -step, 0, picture);
    case "ArrowRight":
      return movedFraming(framing, step, 0, picture);
    case "ArrowUp":
      return movedFraming(framing, 0, -step, picture);
    case "ArrowDown":
      return movedFraming(framing, 0, step, picture);
    // "=" is + without Shift on many layouts.
    case "+":
    case "=":
      return zoomedFraming(framing, framing.zoom + KEY_ZOOM_STEP, picture);
    case "-":
      return zoomedFraming(framing, framing.zoom - KEY_ZOOM_STEP, picture);
    default:
      return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
