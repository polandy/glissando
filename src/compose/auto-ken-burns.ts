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

/** The group's box grown by this factor is the room its frame keeps around the people. */
const GROUP_MARGIN = 1.15;

/**
 * A simple framing rule: zoom alternates in/out by slide index and pans gently sideways in a
 * direction that alternates too, swinging around the picture's focus. Without one it swings
 * around the middle, raised on a portrait picture toward where faces usually are. A focus box
 * wider or taller than the frame at the largest zoom lowers that zoom until the box fits
 * (ADR-0029); the frame is taken as 1/zoom of the picture on both axes, and the pan is small
 * enough to leave the box inside it.
 */
export function autoKenBurns(
  index: number,
  picture: Size,
  focus: PictureFocus | undefined = undefined,
  /** False for a composed pair's half, so the two halves never drift apart (ADR-0028). */
  pansHorizontally = true,
): KenBurns {
  const zoomsIn = index % 2 === 0;
  const pansRight = index % 2 === 0;
  const center = restingCenter(picture, focus);
  const maxZoom = largestZoomShowing(focus);

  const halfPan = pansHorizontally ? (pansRight ? 1 : -1) * (PAN_OFFSET / 2) : 0;
  const startCenterX = clampToPicture(center.x - halfPan);
  const endCenterX = clampToPicture(center.x + halfPan);

  return {
    from: {
      zoom: zoomsIn ? MIN_KEN_BURNS_ZOOM : maxZoom,
      centerX: startCenterX,
      centerY: center.y,
    },
    to: {
      zoom: zoomsIn ? maxZoom : MIN_KEN_BURNS_ZOOM,
      centerX: endCenterX,
      centerY: center.y,
    },
    easing: KEN_BURNS_EASING,
  };
}

function largestZoomShowing(focus: PictureFocus | undefined): number {
  if (focus?.kind !== "subject") return MAX_ZOOM;
  const extent = Math.max(focus.box.width, focus.box.height) * GROUP_MARGIN;
  return Math.min(MAX_ZOOM, Math.max(MIN_KEN_BURNS_ZOOM, 1 / extent));
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
