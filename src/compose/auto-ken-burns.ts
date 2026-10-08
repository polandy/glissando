import { MIN_KEN_BURNS_ZOOM, type KenBurns } from "../player/slideshow";

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
 * A simple framing rule, no subject detection: zoom alternates in/out by slide index, pans
 * gently sideways in a direction that alternates too, and a portrait picture's centre is
 * raised toward where faces usually are.
 */
export function autoKenBurns(index: number, picture: { width: number; height: number }): KenBurns {
  const zoomsIn = index % 2 === 0;
  const pansRight = index % 2 === 0;
  const centerY = picture.height > picture.width ? PORTRAIT_CENTER_Y : BASE_CENTER;

  const startCenterX = BASE_CENTER - (pansRight ? 1 : -1) * (PAN_OFFSET / 2);
  const endCenterX = BASE_CENTER + (pansRight ? 1 : -1) * (PAN_OFFSET / 2);

  return {
    from: {
      zoom: zoomsIn ? MIN_KEN_BURNS_ZOOM : MAX_ZOOM,
      centerX: startCenterX,
      centerY,
    },
    to: {
      zoom: zoomsIn ? MAX_ZOOM : MIN_KEN_BURNS_ZOOM,
      centerX: endCenterX,
      centerY,
    },
    easing: "linear",
  };
}
