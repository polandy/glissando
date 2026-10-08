import type { Framing, Size } from "../../player";
import { movedFraming, resizedFraming, zoomedFraming, type Corner } from "./frame-geometry";

/** A point in page pixels, as pointer events report it. */
export interface PagePoint {
  readonly x: number;
  readonly y: number;
}

/** Where the picture sits on the page, in pixels. */
export interface PictureBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** How far, in CSS pixels, a pointer travels before a tap becomes a drag. */
export const DRAG_THRESHOLD_PX = 8;

/** What a pointer went down on: one of the active frame's corners, or anywhere else on the picture. */
export type GestureTarget =
  { readonly kind: "picture" } | { readonly kind: "corner"; readonly corner: Corner };

/** How a gesture ended once its last pointer is up. */
export type GestureEnd =
  | { readonly kind: "tap" }
  | { readonly kind: "framing"; readonly framing: Framing }
  | { readonly kind: "none" };

type Gesture =
  | { readonly kind: "move"; readonly start: Framing; readonly from: PagePoint }
  | {
      readonly kind: "resize";
      readonly start: Framing;
      readonly from: PagePoint;
      readonly corner: Corner;
    }
  | { readonly kind: "pinch"; readonly start: Framing; readonly distance: number };

/**
 * The active frame's pointer gestures: one pointer anywhere on the picture moves it by the
 * pointer's travel, one on a corner resizes it, two pointers pinch its zoom. A single pointer
 * changes nothing until it has travelled `DRAG_THRESHOLD_PX`; one that goes up before is a tap.
 * Pure: page points in, framings out.
 */
export class FrameGesture {
  readonly #size: Size;
  readonly #pointers = new Map<number, PagePoint>();
  #gesture: Gesture | null = null;
  #latest: Framing | null = null;
  /** A single pointer has travelled past the threshold, or a second one joined. */
  #dragging = false;

  constructor(size: Size) {
    this.#size = size;
  }

  /** No pointer is down: the next one starts a new gesture. */
  get idle(): boolean {
    return this.#pointers.size === 0;
  }

  /** Returns whether the pointer takes part in a gesture (its default action is then unwanted). */
  down(pointerId: number, point: PagePoint, target: GestureTarget, framing: Framing): boolean {
    const start = this.#latest ?? framing;
    if (this.#pointers.size > 1) {
      return false;
    }
    this.#pointers.set(pointerId, point);
    if (this.#pointers.size === 2) {
      this.#gesture = { kind: "pinch", start, distance: this.#distance() };
      this.#dragging = true;
      return true;
    }
    this.#gesture =
      target.kind === "corner"
        ? { kind: "resize", start, from: point, corner: target.corner }
        : { kind: "move", start, from: point };
    return true;
  }

  /** The framing the gesture has reached; null when the pointer is not part of one. */
  move(pointerId: number, point: PagePoint, picture: PictureBox): Framing | null {
    const gesture = this.#gesture;
    if (gesture === null || !this.#pointers.has(pointerId)) {
      return null;
    }
    this.#pointers.set(pointerId, point);
    if (gesture.kind !== "pinch" && !this.#dragging) {
      const travel = Math.hypot(point.x - gesture.from.x, point.y - gesture.from.y);
      if (travel < DRAG_THRESHOLD_PX) {
        return null;
      }
      this.#dragging = true;
    }
    switch (gesture.kind) {
      case "move":
        this.#latest = movedFraming(
          gesture.start,
          (point.x - gesture.from.x) / picture.width,
          (point.y - gesture.from.y) / picture.height,
          this.#size,
        );
        break;
      case "resize": {
        const onPicture = {
          x: (point.x - picture.left) / picture.width,
          y: (point.y - picture.top) / picture.height,
        };
        this.#latest = resizedFraming(gesture.start, gesture.corner, onPicture, this.#size);
        break;
      }
      case "pinch":
        if (this.#pointers.size === 2 && gesture.distance > 0) {
          const zoom = gesture.start.zoom * (this.#distance() / gesture.distance);
          this.#latest = zoomedFraming(gesture.start, zoom, this.#size);
        }
        break;
    }
    return this.#latest;
  }

  /** How the gesture ended, once its last pointer is up; "none" before that. */
  up(pointerId: number): GestureEnd {
    if (!this.#pointers.delete(pointerId) || this.#pointers.size > 0) {
      return { kind: "none" };
    }
    const done = this.#latest;
    const tapped = !this.#dragging;
    this.#gesture = null;
    this.#latest = null;
    this.#dragging = false;
    if (tapped) {
      return { kind: "tap" };
    }
    return done === null ? { kind: "none" } : { kind: "framing", framing: done };
  }

  #distance(): number {
    const [a, b] = [...this.#pointers.values()];
    return a === undefined || b === undefined ? 0 : Math.hypot(a.x - b.x, a.y - b.y);
  }
}
