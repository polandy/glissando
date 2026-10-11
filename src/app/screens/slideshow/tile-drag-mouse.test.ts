import { describe, expect, it } from "vitest";
import { MOVE_THRESHOLD_PX, PRIMARY_BUTTON } from "./tile-drag-types";
import { FINGER, harness } from "./tile-drag-harness";

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
