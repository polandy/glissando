import { describe, expect, it } from "vitest";
import { frameRect } from "./frame-geometry";
import { FrameGesture } from "./frame-gesture";

const SIZE = { width: 400, height: 300 };
/** The picture shown 400 × 300 px at the page's origin: a pixel is 1/400 of its width. */
const PICTURE = { left: 0, top: 0, width: 400, height: 300 };
const START = { zoom: 2, centerX: 0.5, centerY: 0.5 };

describe("FrameGesture", () => {
  it("a pointer down inside the frame and moved drags the frame along", () => {
    const gesture = new FrameGesture(SIZE);
    gesture.down(1, { x: 200, y: 150 }, { kind: "frame" }, START);

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
    gesture.down(1, { x: 150, y: 150 }, { kind: "frame" }, start);
    gesture.down(2, { x: 250, y: 150 }, { kind: "other" }, start);

    const pinched = gesture.move(2, { x: 350, y: 150 }, PICTURE);

    expect(pinched?.zoom).toBeCloseTo(2.4);
  });

  it("pinches with two pointers even when the first went down beside the frame", () => {
    const gesture = new FrameGesture(SIZE);
    gesture.down(1, { x: 10, y: 10 }, { kind: "other" }, START);
    gesture.down(2, { x: 110, y: 10 }, { kind: "other" }, START);

    expect(gesture.move(2, { x: 60, y: 10 }, PICTURE)?.zoom).toBeCloseTo(1);
  });

  it("a pointer down outside the frame starts nothing", () => {
    const gesture = new FrameGesture(SIZE);

    expect(gesture.down(1, { x: 5, y: 5 }, { kind: "other" }, START)).toBe(false);
    expect(gesture.move(1, { x: 50, y: 50 }, PICTURE)).toBeNull();
  });

  it("ends with the last framing once the last pointer is up, and only then", () => {
    const gesture = new FrameGesture(SIZE);
    gesture.down(1, { x: 150, y: 150 }, { kind: "frame" }, START);
    gesture.down(2, { x: 250, y: 150 }, { kind: "other" }, START);
    const pinched = gesture.move(2, { x: 300, y: 150 }, PICTURE);

    expect(gesture.up(2)).toBeNull();
    expect(gesture.up(1)).toEqual(pinched);
    expect(gesture.up(1)).toBeNull();
  });

  it("a tap without a move ends with nothing to store", () => {
    const gesture = new FrameGesture(SIZE);
    gesture.down(1, { x: 200, y: 150 }, { kind: "frame" }, START);

    expect(gesture.up(1)).toBeNull();
  });
});
