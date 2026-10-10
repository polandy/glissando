import type { FrameScheduler } from "../../../player";
import type { Scheduler } from "../../../ui-kit/scheduler";

/**
 * The picture strip's pointer drag, for mouse and touch alike (dev-docs/APP.md, Moving;
 * ADR-0019). Pure and driven by the strip with plain pointer data; timing and hit-testing come
 * in as ports, so a test drives a whole drag without waiting on a real timer or frame.
 */

/** A mouse starts dragging, and a touch hold cancels, once the pointer moves this far. */
export const MOVE_THRESHOLD_PX = 8;
/** How long a finger holds a tile still before it lifts (ADR-0019). */
export const HOLD_MS = 450;
/** Near this many px of the viewport's top or bottom edge, the page auto-scrolls. */
export const SCROLL_EDGE_PX = 64;
/** The auto-scroll's fastest step, reached right at the edge. */
export const MAX_SCROLL_STEP_PX = 14;
/** `PointerEvent.button` of a mouse's main (usually left) button, and of a touch contact. */
export const PRIMARY_BUTTON = 0;

export interface DropTarget {
  readonly pictureId: string;
  readonly after: boolean;
}

export interface PointerDownInput {
  readonly pointerType: "mouse" | "touch";
  /** The gesture's pointer: a second pointer (another finger) must not join or end it. */
  readonly pointerId: number;
  /** A mouse drags only with `PRIMARY_BUTTON`; a right- or middle-press leaves the tile alone. */
  readonly button: number;
  readonly x: number;
  readonly y: number;
  readonly pictureId: string;
}

export interface PointerPoint {
  readonly x: number;
  readonly y: number;
}

export interface PointerMoveInput extends PointerPoint {
  readonly pointerId: number;
}

/** What the drag is doing, for the strip to render: a ghost, a drop mark, the faded tiles. */
export interface TileDragState {
  /** Held on touch, from the hold until the finger lifts: the strip cancels page scrolling. */
  readonly lifted: boolean;
  /** The dragged picture ids in play order, or null while not actively dragging. */
  readonly groupIds: readonly string[] | null;
  /** Where the ghost stack follows the pointer; null together with `groupIds`. */
  readonly ghost: PointerPoint | null;
  readonly dropMark: DropTarget | null;
}

const IDLE_STATE: TileDragState = { lifted: false, groupIds: null, ghost: null, dropMark: null };

export interface TileDragPorts {
  readonly holdScheduler: Scheduler;
  readonly frameScheduler: FrameScheduler;
  /** The tile under a viewport point, and whether the drop would land before or after it. */
  readonly hitTest: (x: number, y: number) => DropTarget | null;
  /** The scrollable viewport's edges, read fresh on every move (the page can scroll or resize). */
  readonly viewportEdges: () => { readonly top: number; readonly bottom: number };
  /** The current selection and play order, read when a drag starts or a touch hold fires. */
  readonly selection: () => ReadonlySet<string>;
  readonly order: () => readonly string[];
  /** A touch hold fired: the strip selects the held tile before dragging it can start. */
  readonly onHold: (pictureId: string) => void;
  /** The state changed from a scheduled callback (a hold fired, an auto-scroll frame). */
  readonly onChange: () => void;
  /** Scrolls the page by this many px (auto-scroll near an edge); positive is down. */
  readonly onScrollBy: (px: number) => void;
  readonly onDrop: (groupIds: readonly string[], insertion: number) => void;
  /** The drag or hold consumed the gesture: the click that follows pointerup must do nothing. */
  readonly onSuppressClick: () => void;
}

type Phase =
  | { readonly kind: "idle" }
  | {
      readonly kind: "pendingMouse";
      readonly pictureId: string;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly kind: "pendingHold";
      readonly pictureId: string;
      readonly x: number;
      readonly y: number;
      readonly cancelHold: () => void;
    }
  | { readonly kind: "lifted"; readonly pictureId: string; readonly x: number; readonly y: number }
  | {
      readonly kind: "dragging";
      readonly groupIds: readonly string[];
      readonly x: number;
      readonly y: number;
    };

function distance(a: PointerPoint, b: PointerPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The auto-scroll step for a pointer at `y`: 0 outside the edge zones, signed toward the edge. */
function scrollSpeed(y: number, edges: { readonly top: number; readonly bottom: number }): number {
  const fromTop = Math.max(0, y - edges.top);
  const fromBottom = Math.max(0, edges.bottom - y);
  if (fromTop < SCROLL_EDGE_PX) {
    return -MAX_SCROLL_STEP_PX * (1 - fromTop / SCROLL_EDGE_PX);
  }
  if (fromBottom < SCROLL_EDGE_PX) {
    return MAX_SCROLL_STEP_PX * (1 - fromBottom / SCROLL_EDGE_PX);
  }
  return 0;
}

export class TileDrag {
  readonly #ports: TileDragPorts;
  #phase: Phase = { kind: "idle" };
  #dropMark: DropTarget | null = null;
  #scrollSpeed = 0;
  #frameHandle: number | null = null;
  /** The pointer driving the current gesture; null while idle. */
  #activePointerId: number | null = null;

  constructor(ports: TileDragPorts) {
    this.#ports = ports;
  }

  get state(): TileDragState {
    if (this.#phase.kind === "dragging") {
      return {
        lifted: true,
        groupIds: this.#phase.groupIds,
        ghost: { x: this.#phase.x, y: this.#phase.y },
        dropMark: this.#dropMark,
      };
    }
    return { ...IDLE_STATE, lifted: this.#phase.kind === "lifted" };
  }

  /** A mouse press, or a finger touching a tile: starts the 8 px move or the 450 ms hold. */
  pointerDown({ pointerType, pointerId, button, x, y, pictureId }: PointerDownInput): void {
    if (this.#phase.kind !== "idle" && pointerId !== this.#activePointerId) {
      // A second pointer (another finger) must not interrupt the first's gesture.
      return;
    }
    if (pointerType === "mouse" && button !== PRIMARY_BUTTON) {
      return;
    }
    this.#endDrag();
    this.#activePointerId = pointerId;
    if (pointerType === "mouse") {
      this.#phase = { kind: "pendingMouse", pictureId, x, y };
      return;
    }
    const cancelHold = this.#ports.holdScheduler.after(HOLD_MS, () => this.#onHoldFired(pictureId));
    this.#phase = { kind: "pendingHold", pictureId, x, y, cancelHold };
  }

  pointerMove({ pointerId, x, y }: PointerMoveInput): void {
    if (pointerId !== this.#activePointerId) {
      return;
    }
    const phase = this.#phase;
    switch (phase.kind) {
      case "idle":
        return;
      case "pendingMouse":
        if (distance(phase, { x, y }) > MOVE_THRESHOLD_PX) {
          this.#startDragging(phase.pictureId, x, y);
        }
        return;
      case "pendingHold":
        if (distance(phase, { x, y }) > MOVE_THRESHOLD_PX) {
          // The finger is scrolling, not holding still: the page scrolls as usual (ADR-0019).
          phase.cancelHold();
          this.#endDrag();
        }
        return;
      case "lifted":
        if (distance(phase, { x, y }) > MOVE_THRESHOLD_PX) {
          this.#startDragging(phase.pictureId, x, y);
        }
        return;
      case "dragging":
        this.#phase = { ...phase, x, y };
        this.#updateDropMark(phase.groupIds, x, y);
        this.#updateAutoScroll(y);
        this.#ports.onChange();
        return;
    }
  }

  /** A mouse release, or a finger lifted off the screen. */
  pointerUp(pointerId: number): void {
    if (pointerId !== this.#activePointerId) {
      return;
    }
    const phase = this.#phase;
    switch (phase.kind) {
      case "idle":
        return;
      case "pendingMouse":
        this.#endDrag();
        return;
      case "pendingHold":
        phase.cancelHold();
        this.#endDrag();
        return;
      case "lifted":
        // Letting go of a held tile in place only selects it (already done by the hold).
        this.#endDrag();
        this.#ports.onSuppressClick();
        this.#ports.onChange();
        return;
      case "dragging": {
        const insertion = this.#insertionFor(this.#dropMark);
        const groupIds = phase.groupIds;
        this.#endDrag();
        this.#ports.onSuppressClick();
        this.#ports.onChange();
        if (insertion !== null) {
          this.#ports.onDrop(groupIds, insertion);
        }
        return;
      }
    }
  }

  /** The browser cancelled the gesture (e.g. a system gesture took over): no drop happens. */
  pointerCancel(pointerId: number): void {
    if (pointerId !== this.#activePointerId) {
      return;
    }
    if (this.#phase.kind === "pendingHold") {
      this.#phase.cancelHold();
    }
    const wasActive = this.#phase.kind === "lifted" || this.#phase.kind === "dragging";
    this.#endDrag();
    if (wasActive) {
      this.#ports.onChange();
    }
  }

  #onHoldFired(pictureId: string): void {
    if (this.#phase.kind !== "pendingHold" || this.#phase.pictureId !== pictureId) {
      return;
    }
    const { x, y } = this.#phase;
    this.#ports.onHold(pictureId);
    this.#phase = { kind: "lifted", pictureId, x, y };
    this.#ports.onChange();
  }

  #startDragging(pictureId: string, x: number, y: number): void {
    const order = this.#ports.order();
    const selection = this.#ports.selection();
    const groupIds = selection.has(pictureId)
      ? order.filter((id) => selection.has(id))
      : [pictureId];
    this.#phase = { kind: "dragging", groupIds, x, y };
    this.#updateDropMark(groupIds, x, y);
    this.#updateAutoScroll(y);
    this.#ports.onChange();
  }

  /** Dropping on the dragged tile itself (a group of one) marks nowhere: it would not move. */
  #updateDropMark(groupIds: readonly string[], x: number, y: number): void {
    const hit = this.#ports.hitTest(x, y);
    this.#dropMark =
      hit !== null && groupIds.length === 1 && hit.pictureId === groupIds[0] ? null : hit;
  }

  #updateAutoScroll(y: number): void {
    this.#scrollSpeed = scrollSpeed(y, this.#ports.viewportEdges());
    if (this.#scrollSpeed !== 0 && this.#frameHandle === null) {
      this.#frameHandle = this.#ports.frameScheduler.request(this.#scrollFrame);
    }
  }

  /** One auto-scroll step; re-tests the drop mark since the content moved under the pointer. */
  readonly #scrollFrame = (): void => {
    this.#frameHandle = null;
    if (this.#phase.kind !== "dragging" || this.#scrollSpeed === 0) {
      return;
    }
    this.#ports.onScrollBy(this.#scrollSpeed);
    this.#updateDropMark(this.#phase.groupIds, this.#phase.x, this.#phase.y);
    this.#ports.onChange();
    this.#frameHandle = this.#ports.frameScheduler.request(this.#scrollFrame);
  };

  #insertionFor(dropMark: DropTarget | null): number | null {
    if (dropMark === null) {
      return null;
    }
    const index = this.#ports.order().indexOf(dropMark.pictureId);
    return index === -1 ? null : index + (dropMark.after ? 1 : 0);
  }

  #endDrag(): void {
    if (this.#frameHandle !== null) {
      this.#ports.frameScheduler.cancel(this.#frameHandle);
      this.#frameHandle = null;
    }
    this.#scrollSpeed = 0;
    this.#dropMark = null;
    this.#phase = { kind: "idle" };
    this.#activePointerId = null;
  }
}
