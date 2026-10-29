import { describe, expect, it } from "vitest";
import {
  HOLD_MS,
  MOVE_THRESHOLD_PX,
  PRIMARY_BUTTON,
  type PointerDownInput,
} from "./tile-drag-types";
import { FINGER, harness } from "./tile-drag-harness";

describe("TileDrag, a touch hold", () => {
  it("fires after 450 ms still, lifting the tile but not yet dragging", () => {
    const { drag, holdScheduler } = harness();
    drag.pointerDown({
      pointerType: "touch",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "b",
    });

    holdScheduler.advance(HOLD_MS);

    expect(drag.state.lifted).toBe(true);
    expect(drag.state.groupIds).toBeNull();
  });

  it("is cancelled by moving past the threshold before it fires: the finger scrolls instead", () => {
    const { drag, holdScheduler } = harness();
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

    expect(drag.state.lifted).toBe(false);
  });

  it("survives a move within the threshold", () => {
    const { drag, holdScheduler } = harness();
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
  });

  it("drags once lifted and moved past the threshold", () => {
    const { drag, holdScheduler } = harness();
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

    expect(drag.state.groupIds).toEqual(["b"]);
  });

  it("only suppresses the click when let go in place after lifting", () => {
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
    const { drag, holdScheduler } = harness();
    const press: PointerDownInput = {
      pointerType: "touch",
      pointerId: FINGER,
      button: PRIMARY_BUTTON,
      x: 0,
      y: 0,
      pictureId: "b",
    };
    drag.pointerDown(press);
    holdScheduler.advance(300);

    drag.pointerDown(press);
    holdScheduler.advance(HOLD_MS - 300);

    expect(drag.state.lifted).toBe(false);
    holdScheduler.advance(300);
  });

  it("cancels the hold on pointer cancel, leaving no selection", () => {
    const { drag, holdScheduler } = harness();
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
