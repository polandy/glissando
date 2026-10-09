import type { PictureFocus } from "../library/picture-focus";
import type { Size } from "../player/ken-burns";
import { MIN_KEN_BURNS_ZOOM, type Easing, type KenBurns } from "../player/slideshow";

/** Every motion, automatic or the user's own, runs at an even pace. */
export const KEN_BURNS_EASING: Easing = "linear";

/** Largest zoom the automatic framing reaches; `MIN_KEN_BURNS_ZOOM` is the smallest. */
const MAX_ZOOM = 1.2;

/** Centre of an unbiased picture; also the resting point a pan swings around. */
const BASE_CENTER = 0.5;

/** How far a pan swings the centre from `BASE_CENTER`, kept small for a "gentle" motion. */
const PAN_OFFSET = 0.1;

/**
 * Where a portrait picture's centre sits vertically: faces usually sit in the upper part of a
 * portrait photo, so the frame aims there instead of the geometric middle.
 */
const PORTRAIT_CENTER_Y = 0.4;

/**
 * A simple framing rule: zoom alternates in/out by slide index and pans gently sideways in a
 * direction that alternates too, swinging around the picture's focus. Without one it swings
 * around the middle, raised on a portrait picture toward where faces usually are.
 */
export function autoKenBurns(
  index: number,
  picture: Size,
  focus: PictureFocus | undefined = undefined,
): KenBurns {
  const zoomsIn = index % 2 === 0;
  const pansRight = index % 2 === 0;
  const center = restingCenter(picture, focus);

  const halfPan = (pansRight ? 1 : -1) * (PAN_OFFSET / 2);
  const startCenterX = clampToPicture(center.x - halfPan);
  const endCenterX = clampToPicture(center.x + halfPan);

  return {
    from: {
      zoom: zoomsIn ? MIN_KEN_BURNS_ZOOM : MAX_ZOOM,
      centerX: startCenterX,
      centerY: center.y,
    },
    to: {
      zoom: zoomsIn ? MAX_ZOOM : MIN_KEN_BURNS_ZOOM,
      centerX: endCenterX,
      centerY: center.y,
    },
    easing: KEN_BURNS_EASING,
  };
}

function restingCenter(
  picture: Size,
  focus: PictureFocus | undefined,
): { readonly x: number; readonly y: number } {
  if (focus?.kind === "subject") {
    const { box } = focus;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  return {
    x: BASE_CENTER,
    y: picture.height > picture.width ? PORTRAIT_CENTER_Y : BASE_CENTER,
  };
}

function clampToPicture(coordinate: number): number {
  return Math.min(1, Math.max(0, coordinate));
}
