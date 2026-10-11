import type { FrameScheduler } from "../../../player";
import type { Scheduler } from "../../../ui-kit/scheduler";

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

export const IDLE_STATE: TileDragState = {
  lifted: false,
  groupIds: null,
  ghost: null,
  dropMark: null,
};

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
