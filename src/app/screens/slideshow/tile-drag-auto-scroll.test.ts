import { describe, expect, it } from "vitest";
import { MAX_SCROLL_STEP_PX, MOVE_THRESHOLD_PX, PRIMARY_BUTTON } from "./tile-drag-types";
import { FINGER, VIEWPORT, harness } from "./tile-drag-harness";

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
