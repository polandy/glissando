import { describe, expect, it } from "vitest";
import { groupFocusBox, MIN_RELATIVE_FACE_EDGE } from "./group-focus-box";
import type { FocusBox } from "./picture-focus";

const box = (x: number, y: number, size: number): FocusBox => ({
  x,
  y,
  width: size,
  height: size,
});

describe("groupFocusBox", () => {
  it("is the anchor itself when there is no other face", () => {
    const anchor = box(0.4, 0.3, 0.2);

    expect(groupFocusBox(anchor, [])).toEqual(anchor);
  });

  it("spans the anchor and a face of similar size beside it", () => {
    const group = groupFocusBox(box(0.2, 0.3, 0.2), [box(0.6, 0.35, 0.2)]);

    expect(group.x).toBeCloseTo(0.2);
    expect(group.y).toBeCloseTo(0.3);
    expect(group.width).toBeCloseTo(0.6);
    expect(group.height).toBeCloseTo(0.25);
  });

  it("spans three faces", () => {
    const group = groupFocusBox(box(0.4, 0.4, 0.2), [box(0.1, 0.2, 0.2), box(0.7, 0.5, 0.2)]);

    expect(group).toEqual({
      x: 0.1,
      y: 0.2,
      width: expect.closeTo(0.8),
      height: expect.closeTo(0.5),
    });
  });

  it("leaves out a face whose edge is under the minimum share of the anchor's", () => {
    const anchor = box(0.2, 0.3, 0.2);
    const background = box(0.8, 0.8, 0.2 * MIN_RELATIVE_FACE_EDGE * 0.9);

    expect(groupFocusBox(anchor, [background])).toEqual(anchor);
  });

  it("keeps a face whose edge is exactly the minimum share of the anchor's", () => {
    const anchor = box(0.2, 0.3, 0.2);
    const smaller = box(0.7, 0.3, 0.2 * MIN_RELATIVE_FACE_EDGE);

    expect(groupFocusBox(anchor, [smaller]).width).toBeCloseTo(0.5 + 0.2 * MIN_RELATIVE_FACE_EDGE);
  });

  it("measures a face's edge by its area, not by its width", () => {
    const anchor = box(0.2, 0.3, 0.2);
    const sliver = { x: 0.6, y: 0.3, width: 0.2, height: 0.01 };

    expect(groupFocusBox(anchor, [sliver])).toEqual(anchor);
  });
});
