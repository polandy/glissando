import { describe, expect, it } from "vitest";
import { FakeFrameScheduler } from "../../../player/testing/fakes";
import { FakeScheduler } from "../../../ui-kit/testing/fake-scheduler";
import {
  HOLD_MS,
  MAX_SCROLL_STEP_PX,
  MOVE_THRESHOLD_PX,
  PRIMARY_BUTTON,
  TileDrag,
  type DropTarget,
  type TileDragPorts,
} from "./tile-drag";

const ORDER = ["a", "b", "c", "d"];
const VIEWPORT = { top: 0, bottom: 600 };
/** The pointer driving each gesture; a second one is `OTHER_FINGER`. */
const FINGER = 1;
const OTHER_FINGER = 2;
const SECONDARY_BUTTON = 2;

function harness(overrides: Partial<TileDragPorts> = {}) {
  const holdScheduler = new FakeScheduler();
  const frameScheduler = new FakeFrameScheduler();
  const calls = {
    held: [] as string[],
    changes: 0,
    scrolledBy: [] as number[],
    dropped: [] as [readonly string[], number][],
    suppressedClicks: 0,
  };
  let hitResult: DropTarget | null = null;
  let selected = new Set<string>();
  let order: readonly string[] = ORDER;
  let viewportEdges = VIEWPORT;
  const ports: TileDragPorts = {
    holdScheduler,
    frameScheduler,
    hitTest: () => hitResult,
    viewportEdges: () => viewportEdges,
    selection: () => selected,
    order: () => order,
    onHold: (pictureId) => calls.held.push(pictureId),
    onChange: () => (calls.changes += 1),
    onScrollBy: (px) => calls.scrolledBy.push(px),
    onDrop: (groupIds, insertion) => calls.dropped.push([groupIds, insertion]),
    onSuppressClick: () => (calls.suppressedClicks += 1),
    ...overrides,
  };
  return {
    drag: new TileDrag(ports),
    holdScheduler,
    frameScheduler,
    calls,
    setHit: (hit: DropTarget | null) => (hitResult = hit),
    setSelected: (ids: readonly string[]) => (selected = new Set(ids)),
    setOrder: (next: readonly string[]) => (order = next),
    setViewportEdges: (edges: typeof VIEWPORT) => (viewportEdges = edges),
  };
}

describe("TileDrag, a mouse", () => {
  it("does not drag before the pointer moves past the threshold", () => {
    const { drag, calls } = harness();
    drag.pointerDown({
      pointerType: "mouse",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 100,
      y: 100,
      pictureId: "b",
    });

    drag.pointerMove({ pointerId: FINGER, x: 100 + MOVE_THRESHOLD_PX, y: 100 });

    expect(drag.state.groupIds).toBeNull();
    expect(calls.changes).toBe(0);
  });

  it("starts dragging once the pointer moves past the threshold, the tile alone unselected", () => {
    const { drag } = harness();
    drag.pointerDown({
      pointerType: "mouse",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 100,
      y: 100,
      pictureId: "b",
    });

    drag.pointerMove({ pointerId: FINGER, x: 100 + MOVE_THRESHOLD_PX + 1, y: 100 });

    expect(drag.state.groupIds).toEqual(["b"]);
    expect(drag.state.ghost).toEqual({ x: 100 + MOVE_THRESHOLD_PX + 1, y: 100 });
    expect(drag.state.lifted).toBe(true);
  });

  it("carries the whole selection, in play order, when the dragged tile is selected", () => {
    const { drag, setSelected } = harness();
    setSelected(["c", "a"]);
    drag.pointerDown({
      pointerType: "mouse",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "a",
    });

    drag.pointerMove({ pointerId: FINGER, x: 0, y: MOVE_THRESHOLD_PX + 1 });

    expect(drag.state.groupIds).toEqual(["a", "c"]);
  });

  it("drops at the marked insertion and suppresses the click that follows", () => {
    const { drag, setHit, calls } = harness();
    drag.pointerDown({
      pointerType: "mouse",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "a",
    });
    drag.pointerMove({ pointerId: FINGER, x: 0, y: MOVE_THRESHOLD_PX + 1 });
    setHit({ pictureId: "c", after: true });
    drag.pointerMove({ pointerId: FINGER, x: 50, y: MOVE_THRESHOLD_PX + 1 });

    drag.pointerUp(FINGER);

    expect(calls.dropped).toEqual([[["a"], 3]]);
    expect(calls.suppressedClicks).toBe(1);
    expect(drag.state.groupIds).toBeNull();
  });

  it("drops nothing when released over no drop mark", () => {
    const { drag, calls } = harness();
    drag.pointerDown({
      pointerType: "mouse",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "a",
    });
    drag.pointerMove({ pointerId: FINGER, x: 0, y: MOVE_THRESHOLD_PX + 1 });

    drag.pointerUp(FINGER);

    expect(calls.dropped).toEqual([]);
    expect(calls.suppressedClicks).toBe(1);
  });

  it("marks nowhere when a lone dragged tile hovers over itself", () => {
    const { drag, setHit } = harness();
    setHit({ pictureId: "a", after: false });
    drag.pointerDown({
      pointerType: "mouse",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "a",
    });

    drag.pointerMove({ pointerId: FINGER, x: 0, y: MOVE_THRESHOLD_PX + 1 });

    expect(drag.state.dropMark).toBeNull();
  });

  it("marks a group member when the group has several tiles", () => {
    const { drag, setHit, setSelected } = harness();
    setSelected(["a", "b"]);
    setHit({ pictureId: "b", after: false });
    drag.pointerDown({
      pointerType: "mouse",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "a",
    });

    drag.pointerMove({ pointerId: FINGER, x: 0, y: MOVE_THRESHOLD_PX + 1 });

    expect(drag.state.dropMark).toEqual({ pictureId: "b", after: false });
  });

  it("drops nowhere, unsuppressed, when let go before the move threshold: a plain click", () => {
    const { drag, calls } = harness();
    drag.pointerDown({
      pointerType: "mouse",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "a",
    });

    drag.pointerUp(FINGER);

    expect(calls.dropped).toEqual([]);
    expect(calls.suppressedClicks).toBe(0);
  });
});

describe("TileDrag, a touch hold", () => {
  it("fires after 450 ms still, lifting (selecting) the tile but not yet dragging", () => {
    const { drag, holdScheduler, calls } = harness();
    drag.pointerDown({
      pointerType: "touch",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "b",
    });

    holdScheduler.advance(HOLD_MS);

    expect(calls.held).toEqual(["b"]);
    expect(drag.state.lifted).toBe(true);
    expect(drag.state.groupIds).toBeNull();
  });

  it("is cancelled by moving past the threshold before it fires: the finger scrolls instead", () => {
    const { drag, holdScheduler, calls } = harness();
    drag.pointerDown({
      pointerType: "touch",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "b",
    });

    drag.pointerMove({ pointerId: FINGER, x: 0, y: MOVE_THRESHOLD_PX + 1 });
    holdScheduler.advance(HOLD_MS);

    expect(calls.held).toEqual([]);
    expect(drag.state.lifted).toBe(false);
  });

  it("survives a move within the threshold", () => {
    const { drag, holdScheduler, calls } = harness();
    drag.pointerDown({
      pointerType: "touch",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "b",
    });

    drag.pointerMove({ pointerId: FINGER, x: 0, y: MOVE_THRESHOLD_PX - 1 });
    holdScheduler.advance(HOLD_MS);

    expect(calls.held).toEqual(["b"]);
  });

  it("drags once lifted and moved past the threshold, the held tile selected first", () => {
    const { drag, holdScheduler, setSelected, calls } = harness();
    drag.pointerDown({
      pointerType: "touch",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "b",
    });
    holdScheduler.advance(HOLD_MS);
    // The strip applied `hold(selection, "b")`, as `onHold` asked.
    setSelected(["b"]);

    drag.pointerMove({ pointerId: FINGER, x: 0, y: MOVE_THRESHOLD_PX + 1 });

    expect(drag.state.groupIds).toEqual(["b"]);
    expect(calls.held).toEqual(["b"]);
  });

  it("only selects, suppressing the click, when let go in place after lifting", () => {
    const { drag, holdScheduler, calls } = harness();
    drag.pointerDown({
      pointerType: "touch",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "b",
    });
    holdScheduler.advance(HOLD_MS);

    drag.pointerUp(FINGER);

    expect(calls.dropped).toEqual([]);
    expect(calls.suppressedClicks).toBe(1);
    expect(drag.state.lifted).toBe(false);
  });

  it("restarts the hold on a new press whose release went unseen: the old timer lifts nothing", () => {
    const { drag, holdScheduler, calls } = harness();
    const press = { pointerType: "touch", pointerId: FINGER, button: PRIMARY_BUTTON, x: 0, y: 0 };
    drag.pointerDown({ ...press, pictureId: "b" } as const);
    holdScheduler.advance(300);

    drag.pointerDown({ ...press, pictureId: "b" } as const);
    holdScheduler.advance(HOLD_MS - 300);

    expect(calls.held).toEqual([]);
    expect(drag.state.lifted).toBe(false);
    holdScheduler.advance(300);
    expect(calls.held).toEqual(["b"]);
  });

  it("cancels the hold on pointer cancel, leaving no selection", () => {
    const { drag, holdScheduler, calls } = harness();
    drag.pointerDown({
      pointerType: "touch",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "b",
    });

    drag.pointerCancel(FINGER);
    holdScheduler.advance(HOLD_MS);

    expect(calls.held).toEqual([]);
  });

  it("drops nothing on pointer cancel while dragging, without suppressing a click", () => {
    const { drag, holdScheduler, calls } = harness();
    drag.pointerDown({
      pointerType: "touch",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "b",
    });
    holdScheduler.advance(HOLD_MS);
    drag.pointerMove({ pointerId: FINGER, x: 0, y: MOVE_THRESHOLD_PX + 1 });

    drag.pointerCancel(FINGER);

    expect(calls.dropped).toEqual([]);
    expect(calls.suppressedClicks).toBe(0);
    expect(drag.state.groupIds).toBeNull();
  });
});

describe("TileDrag, only the primary mouse button", () => {
  it("starts no drag on a right-button press", () => {
    const { drag, calls } = harness();
    drag.pointerDown({
      pointerType: "mouse",
      pointerId: FINGER,
      button: SECONDARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "a",
    });

    drag.pointerMove({ pointerId: FINGER, x: 0, y: MOVE_THRESHOLD_PX + 1 });

    expect(drag.state.groupIds).toBeNull();
    expect(calls.changes).toBe(0);
  });
});

describe("TileDrag, a second pointer while one drives the gesture", () => {
  it("neither cancels a pending hold nor drags by moving", () => {
    const { drag, holdScheduler, calls } = harness();
    drag.pointerDown({
      pointerType: "touch",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "b",
    });

    drag.pointerMove({ pointerId: OTHER_FINGER, x: 0, y: MOVE_THRESHOLD_PX + 1 });
    holdScheduler.advance(HOLD_MS);

    expect(calls.held).toEqual(["b"]);
    expect(drag.state.groupIds).toBeNull();
  });

  it("does not end the drag by lifting: the first finger still drops", () => {
    const { drag, holdScheduler, setHit, calls } = harness();
    drag.pointerDown({
      pointerType: "touch",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "b",
    });
    holdScheduler.advance(HOLD_MS);
    setHit({ pictureId: "d", after: true });
    drag.pointerMove({ pointerId: FINGER, x: 0, y: MOVE_THRESHOLD_PX + 1 });

    drag.pointerUp(OTHER_FINGER);
    drag.pointerCancel(OTHER_FINGER);

    expect(drag.state.groupIds).toEqual(["b"]);
    drag.pointerUp(FINGER);
    expect(calls.dropped).toEqual([[["b"], 4]]);
  });

  it("does not restart the gesture by touching another tile", () => {
    const { drag, holdScheduler, calls } = harness();
    drag.pointerDown({
      pointerType: "touch",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "b",
    });
    holdScheduler.advance(HOLD_MS);
    drag.pointerMove({ pointerId: FINGER, x: 0, y: MOVE_THRESHOLD_PX + 1 });

    drag.pointerDown({
      pointerType: "touch",
      pointerId: OTHER_FINGER,
      button: PRIMARY_BUTTON,
      x: 9,
      y: 9,
      pictureId: "c",
    });
    holdScheduler.advance(HOLD_MS);

    expect(drag.state.groupIds).toEqual(["b"]);
    expect(calls.held).toEqual(["b"]);
  });
});

describe("TileDrag, auto-scroll near the viewport's edges", () => {
  // Every case starts dragging well away from an edge, at y 300, then moves near one.
  function dragging(drag: TileDrag): void {
    drag.pointerDown({
      pointerType: "mouse",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 300,
      pictureId: "a",
    });
    drag.pointerMove({ pointerId: FINGER, x: 0, y: 300 - MOVE_THRESHOLD_PX - 1 });
  }

  it("scrolls up right at the top edge, at the fastest step", () => {
    const { drag, frameScheduler, calls } = harness();
    dragging(drag);

    drag.pointerMove({ pointerId: FINGER, x: 0, y: 0 });
    frameScheduler.runFrame();

    expect(calls.scrolledBy).toEqual([-MAX_SCROLL_STEP_PX]);
  });

  it("scrolls down near the bottom edge, and keeps scheduling frames while there", () => {
    const { drag, frameScheduler, calls } = harness();
    dragging(drag);

    drag.pointerMove({ pointerId: FINGER, x: 0, y: VIEWPORT.bottom - 1 });
    frameScheduler.runFrame();
    frameScheduler.runFrame();

    expect(calls.scrolledBy).toHaveLength(2);
    expect(calls.scrolledBy[0]).toBeGreaterThan(0);
  });

  it("stops scheduling frames once the pointer leaves the edge zone", () => {
    const { drag, frameScheduler, calls } = harness();
    dragging(drag);
    drag.pointerMove({ pointerId: FINGER, x: 0, y: VIEWPORT.bottom - 1 });

    drag.pointerMove({ pointerId: FINGER, x: 0, y: 300 });
    frameScheduler.runFrame();

    expect(calls.scrolledBy).toEqual([]);
    expect(frameScheduler.hasPendingFrame).toBe(false);
  });

  it("does not scroll away from either edge", () => {
    const { drag, frameScheduler, calls } = harness();
    dragging(drag);

    expect(frameScheduler.hasPendingFrame).toBe(false);
    expect(calls.scrolledBy).toEqual([]);
  });
});
