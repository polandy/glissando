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

/** What a pointer went down on. */
export type GestureTarget =
  | { readonly kind: "frame" }
  | { readonly kind: "corner"; readonly corner: Corner }
  | { readonly kind: "other" };

type Gesture =
  | { readonly kind: "move"; readonly start: Framing; readonly from: PagePoint }
  | { readonly kind: "resize"; readonly start: Framing; readonly corner: Corner }
  | { readonly kind: "pinch"; readonly start: Framing; readonly distance: number };

/**
 * The active frame's pointer gestures: one pointer inside the frame moves it, one on a corner
 * resizes it, two pointers anywhere on the picture pinch its zoom. Pure: page points in, framings out.
 */
export class FrameGesture {
  readonly #size: Size;
  readonly #pointers = new Map<number, PagePoint>();
  #gesture: Gesture | null = null;
  #latest: Framing | null = null;

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
      return true;
    }
    if (target.kind === "other") {
      return false;
    }
    this.#gesture =
      target.kind === "corner"
        ? { kind: "resize", start, corner: target.corner }
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

  /** The framing to store once the last pointer is up; null before that or without a change. */
  up(pointerId: number): Framing | null {
    if (!this.#pointers.delete(pointerId) || this.#pointers.size > 0) {
      return null;
    }
    const done = this.#latest;
    this.#gesture = null;
    this.#latest = null;
    return done;
  }

  #distance(): number {
    const [a, b] = [...this.#pointers.values()];
    return a === undefined || b === undefined ? 0 : Math.hypot(a.x - b.x, a.y - b.y);
  }
}
