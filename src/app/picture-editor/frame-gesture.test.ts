import { describe, expect, it } from "vitest";
import { frameRect } from "./frame-geometry";
import { DRAG_THRESHOLD_PX, FrameGesture } from "./frame-gesture";

const SIZE = { width: 400, height: 300 };
/** The picture shown 400 × 300 px at the page's origin: a pixel is 1/400 of its width. */
const PICTURE = { left: 0, top: 0, width: 400, height: 300 };
const START = { zoom: 2, centerX: 0.5, centerY: 0.5 };

describe("FrameGesture", () => {
  it("a pointer down anywhere on the picture and moved drags the frame by its travel", () => {
    const gesture = new FrameGesture(SIZE);
    gesture.down(1, { x: 200, y: 150 }, { kind: "picture" }, START);

    const moved = gesture.move(1, { x: 240, y: 165 }, PICTURE);

    expect(moved?.centerX).toBeCloseTo(0.6);
    expect(moved?.centerY).toBeCloseTo(0.55);
  });

  it("a pointer down on a corner resizes about the opposite corner", () => {
    const gesture = new FrameGesture(SIZE);
    const before = frameRect(START, SIZE);
    gesture.down(1, { x: 0, y: 0 }, { kind: "corner", corner: "se" }, START);

    const resized = gesture.move(1, { x: 300, y: 225 }, PICTURE);

    const rect = frameRect(resized ?? START, SIZE);
    expect(resized?.zoom).toBeLessThan(2);
    expect(rect.x).toBeCloseTo(before.x);
    expect(rect.y).toBeCloseTo(before.y);
  });

  it("two pointers pinch: spread twice as far apart, the zoom doubles", () => {
    const gesture = new FrameGesture(SIZE);
    const start = { zoom: 1.2, centerX: 0.5, centerY: 0.5 };
    gesture.down(1, { x: 150, y: 150 }, { kind: "picture" }, start);
    gesture.down(2, { x: 250, y: 150 }, { kind: "picture" }, start);

    const pinched = gesture.move(2, { x: 350, y: 150 }, PICTURE);

    expect(pinched?.zoom).toBeCloseTo(2.4);
  });

  it("pinches with two pointers wherever on the picture they go down", () => {
    const gesture = new FrameGesture(SIZE);
    gesture.down(1, { x: 10, y: 10 }, { kind: "picture" }, START);
    gesture.down(2, { x: 110, y: 10 }, { kind: "picture" }, START);

    expect(gesture.move(2, { x: 60, y: 10 }, PICTURE)?.zoom).toBeCloseTo(1);
  });

  it("a third pointer takes no part", () => {
    const gesture = new FrameGesture(SIZE);
    gesture.down(1, { x: 150, y: 150 }, { kind: "picture" }, START);
    gesture.down(2, { x: 250, y: 150 }, { kind: "picture" }, START);

    expect(gesture.down(3, { x: 5, y: 5 }, { kind: "picture" }, START)).toBe(false);
    expect(gesture.move(3, { x: 50, y: 50 }, PICTURE)).toBeNull();
  });

  it("ends with the last framing once the last pointer is up, and only then", () => {
    const gesture = new FrameGesture(SIZE);
    gesture.down(1, { x: 150, y: 150 }, { kind: "picture" }, START);
    gesture.down(2, { x: 250, y: 150 }, { kind: "picture" }, START);
    const pinched = gesture.move(2, { x: 300, y: 150 }, PICTURE);

    expect(gesture.up(2)).toEqual({ kind: "none" });
    expect(gesture.up(1)).toEqual({ kind: "framing", framing: pinched });
    expect(gesture.up(1)).toEqual({ kind: "none" });
  });

  it("a tap without a move ends as a tap, with nothing to store", () => {
    const gesture = new FrameGesture(SIZE);
    gesture.down(1, { x: 200, y: 150 }, { kind: "picture" }, START);

    expect(gesture.up(1)).toEqual({ kind: "tap" });
  });

  describe("the tap/drag threshold", () => {
    const justBelow = DRAG_THRESHOLD_PX - 1;

    it("a jitter below the threshold moves nothing and ends as a tap", () => {
      const gesture = new FrameGesture(SIZE);
      gesture.down(1, { x: 200, y: 150 }, { kind: "picture" }, START);

      expect(gesture.move(1, { x: 200 + justBelow, y: 150 }, PICTURE)).toBeNull();
      expect(gesture.move(1, { x: 200, y: 150 - justBelow }, PICTURE)).toBeNull();
      expect(gesture.up(1)).toEqual({ kind: "tap" });
    });

    it("once passed, the move counts from the down point, without a jump", () => {
      const gesture = new FrameGesture(SIZE);
      gesture.down(1, { x: 200, y: 150 }, { kind: "picture" }, START);
      gesture.move(1, { x: 200 + justBelow, y: 150 }, PICTURE);

      const moved = gesture.move(1, { x: 240, y: 150 }, PICTURE);

      expect(moved?.centerX).toBeCloseTo(0.6);
    });

    it("a drag that passed it and came back is no tap: it stores where it ended", () => {
      const gesture = new FrameGesture(SIZE);
      gesture.down(1, { x: 200, y: 150 }, { kind: "picture" }, START);
      gesture.move(1, { x: 240, y: 150 }, PICTURE);
      const back = gesture.move(1, { x: 201, y: 150 }, PICTURE);

      expect(back?.centerX).toBeCloseTo(0.5025);
      expect(gesture.up(1)).toEqual({ kind: "framing", framing: back });
    });

    it("holds a corner below it too", () => {
      const gesture = new FrameGesture(SIZE);
      gesture.down(1, { x: 300, y: 225 }, { kind: "corner", corner: "se" }, START);

      expect(gesture.move(1, { x: 300 - justBelow, y: 225 }, PICTURE)).toBeNull();
      expect(gesture.up(1)).toEqual({ kind: "tap" });
    });

    it("a pinch starts at once, below it", () => {
      const gesture = new FrameGesture(SIZE);
      gesture.down(1, { x: 150, y: 150 }, { kind: "picture" }, START);
      gesture.down(2, { x: 250, y: 150 }, { kind: "picture" }, START);

      expect(gesture.move(2, { x: 252, y: 150 }, PICTURE)?.zoom).toBeCloseTo(2.04);
      gesture.up(2);
      expect(gesture.up(1)).not.toEqual({ kind: "tap" });
    });
  });
});
