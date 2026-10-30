import type { PictureFocus } from "../library/picture-focus";
import type { Size } from "../player/ken-burns";
import { MIN_KEN_BURNS_ZOOM, type Easing, type KenBurns } from "../player/slideshow";

/** Every motion, automatic or the user's own, runs at an even pace. */
export const KEN_BURNS_EASING: Easing = "linear";

/**
 * Largest zoom the automatic framing reaches for a subject or an unfocused picture;
 * `MIN_KEN_BURNS_ZOOM` is the smallest. Scenery has its own range, below.
 */
const MAX_ZOOM = 1.2;

/**
 * The end zoom never falls below this, so a picture is never still: a subject as large as the
 * picture still gets a slight push in or pull out, at the cost of cutting its edge a little.
 */
export const SMALLEST_ZOOM_TRAVEL = 1.05;

/** Centre of an unbiased picture; also the resting point a pan swings around. */
const BASE_CENTER = 0.5;

/** How far a pan swings the centre from `BASE_CENTER`, kept small for a "gentle" motion. */
const PAN_OFFSET = 0.1;

/**
 * Where a portrait picture's centre sits vertically: faces usually sit in the upper part of a
 * portrait photo, so the frame aims there instead of the geometric middle.
 */
const PORTRAIT_CENTER_Y = 0.4;

/** Scenery's wide end: the gentlest zoom of its slow zoom-in-or-out while it pans (ADR-0037). */
export const SCENERY_ZOOM_WIDE = 1.15;

/** Scenery's tight end: the closest zoom of the same sweep. */
export const SCENERY_ZOOM_TIGHT = 1.35;

/** The group's box grown by this factor is the room its frame keeps around the people. */
const GROUP_MARGIN = 1.15;

/** Today's unscaled Ken Burns motion: a mood's own strength takes its place (ADR-0045). */
export const DEFAULT_KEN_BURNS_STRENGTH = 1;

/**
 * A simple framing rule: zoom alternates in/out by slide index and pans gently sideways in a
 * direction that alternates too, swinging around the picture's focus. Without one it swings
 * around the middle, raised on a portrait picture toward where faces usually are. A focus box
 * wider or taller than the frame at the largest zoom lowers that zoom until the box fits
 * (ADR-0029); the frame is taken as 1/zoom of the picture on both axes, and the pan is small
 * enough to leave the box inside it. `strength` scales how far the motion travels, `MOOD.md`'s
 * Ken Burns strength bullet; `DEFAULT_KEN_BURNS_STRENGTH` reproduces today's motion exactly.
 */
export function autoKenBurns(
  index: number,
  picture: Size,
  focus: PictureFocus | undefined = undefined,
  /** False for a composed pair's half, so the two halves never drift apart (ADR-0028). */
  pansHorizontally = true,
  strength = DEFAULT_KEN_BURNS_STRENGTH,
): KenBurns {
  const zoomsIn = index % 2 === 0;
  const pansRight = index % 2 === 0;
  if (focus?.kind === "scenery" && pansHorizontally) return sceneryKenBurns(pansRight, strength);
  const center = restingCenter(picture, focus);
  const maxZoom = largestZoomShowing(focus, strength);

  const halfPan = pansHorizontally ? (pansRight ? 1 : -1) * ((PAN_OFFSET * strength) / 2) : 0;
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

/**
 * A slow sweep from one edge of the picture to the other, the zoom moving between
 * `SCENERY_ZOOM_WIDE` and `SCENERY_ZOOM_TIGHT` along the way instead of holding steady
 * (ADR-0037): zooming in while panning right, zooming out while panning left. Each end of the
 * pan sits exactly at the edge its own end of the zoom allows (`sceneryEdge`), which keeps the
 * frame inside the picture for every point of the sweep, not only its ends — the pan moves in a
 * straight line between two points that already account for how far the zoom has moved.
 */
function sceneryKenBurns(pansRight: boolean, strength: number): KenBurns {
  const fromZoom = scaledZoom(pansRight ? SCENERY_ZOOM_WIDE : SCENERY_ZOOM_TIGHT, strength);
  const toZoom = scaledZoom(pansRight ? SCENERY_ZOOM_TIGHT : SCENERY_ZOOM_WIDE, strength);
  const fromEdge = sceneryEdge(fromZoom);
  const toEdge = sceneryEdge(toZoom);
  const [startX, endX] = pansRight ? [fromEdge, 1 - toEdge] : [1 - fromEdge, toEdge];
  return {
    from: { zoom: fromZoom, centerX: startX, centerY: BASE_CENTER },
    to: { zoom: toZoom, centerX: endX, centerY: BASE_CENTER },
    easing: KEN_BURNS_EASING,
  };
}

/** How far the frame's near edge sits from the picture's own edge at `zoom`. */
function sceneryEdge(zoom: number): number {
  return BASE_CENTER / zoom;
}

function largestZoomShowing(focus: PictureFocus | undefined, strength: number): number {
  const maxZoom = scaledZoom(MAX_ZOOM, strength);
  if (focus?.kind !== "subject") return maxZoom;
  const extent = Math.max(focus.box.width, focus.box.height) * GROUP_MARGIN;
  return Math.min(maxZoom, Math.max(SMALLEST_ZOOM_TRAVEL, 1 / extent));
}

/** `zoom` scaled toward 1 by the Ken Burns strength `s`: `1 + (zoom - 1) * s` (`MOOD.md`). */
function scaledZoom(zoom: number, strength: number): number {
  return 1 + (zoom - 1) * strength;
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
