import { describe, expect, it } from "vitest";
import { HOLD_MS, MOVE_THRESHOLD_PX, PRIMARY_BUTTON } from "./tile-drag-types";
import { FINGER, OTHER_FINGER, SECONDARY_BUTTON, harness } from "./tile-drag-harness";

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
