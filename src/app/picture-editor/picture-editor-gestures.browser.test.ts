import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { DRAG_THRESHOLD_PX } from "./frame-gesture";
import { AUTOMATIC, element, mountEditor, unmountEditor, view } from "./picture-editor-harness";
// The app's layout, so the picture has its real, phone-width size and pixel tolerances apply.
import "../../styles/tokens.css";
import "../../styles/base.css";

afterEach(() => unmountEditor());

const activeFrame = () => element(".frame.active");

/** Start top left, end bottom right, overlapping in the middle (4:3 picture). */
const APART = {
  from: { zoom: 2, centerX: 0.3, centerY: 0.35 },
  to: { zoom: 2, centerX: 0.7, centerY: 0.65 },
};
/** The end frame in the middle of the start frame, which spans the picture's width. */
const NESTED = {
  from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  to: { zoom: 2, centerX: 0.5, centerY: 0.5 },
};

/** A page point given in picture coordinates, shifted by `dx` / `dy` CSS pixels. */
function pagePoint(x: number, y: number, dx = 0, dy = 0) {
  const picture = element(".pic").getBoundingClientRect();
  return { x: picture.left + x * picture.width + dx, y: picture.top + y * picture.height + dy };
}

function pointer(point: { x: number; y: number }, pointerId = 1) {
  return { bubbles: true, isPrimary: true, pointerId, clientX: point.x, clientY: point.y };
}

/** A pointer down on whatever the browser hits at `point`, as a real finger would. */
function downAt(point: { x: number; y: number }): Element {
  const hit = document.elementFromPoint(point.x, point.y);
  if (hit === null) {
    throw new Error(`nothing at ${point.x}, ${point.y}`);
  }
  hit.dispatchEvent(new PointerEvent("pointerdown", pointer(point)));
  flushSync();
  return hit;
}

function moveTo(point: { x: number; y: number }): void {
  window.dispatchEvent(new PointerEvent("pointermove", pointer(point)));
  flushSync();
}

function upAt(point: { x: number; y: number }): void {
  window.dispatchEvent(new PointerEvent("pointerup", pointer(point)));
  flushSync();
}

function tapAt(point: { x: number; y: number }): void {
  downAt(point);
  upAt(point);
}

describe("picture editor gestures", () => {
  it("drags the active frame and stores the motion once, on release", () => {
    const zoomed = { ...AUTOMATIC, from: { zoom: 2, centerX: 0.5, centerY: 0.5 } };
    const { calls } = mountEditor(view({ motion: zoomed }));

    downAt(pagePoint(0.5, 0.5));
    moveTo(pagePoint(0.6, 0.55));
    moveTo(pagePoint(0.7, 0.6));
    expect(calls.changed).toEqual([]);
    upAt(pagePoint(0.7, 0.6));

    expect(calls.changed).toHaveLength(1);
    expect(calls.changed[0]?.from.centerX).toBeCloseTo(0.7);
    expect(calls.changed[0]?.from.centerY).toBeCloseTo(0.6);
  });

  it.each([
    ["outside both frames", 0.85, 0.2],
    ["inside the inactive frame", 0.85, 0.7],
  ])("a drag started %s moves the active frame by the pointer's travel", (_, x, y) => {
    const { calls } = mountEditor(view({ motion: APART }));

    downAt(pagePoint(x, y));
    moveTo(pagePoint(x - 0.05, y + 0.05));
    upAt(pagePoint(x - 0.05, y + 0.05));

    expect(activeFrame().dataset["key"]).toBe("from");
    expect(calls.changed[0]?.from.centerX).toBeCloseTo(0.25);
    expect(calls.changed[0]?.from.centerY).toBeCloseTo(0.4);
    expect(calls.changed[0]?.to).toEqual(APART.to);
  });

  it("a tap inside the inactive frame picks it without moving anything", () => {
    const { calls } = mountEditor(view({ motion: APART }));

    tapAt(pagePoint(0.85, 0.75));

    expect(activeFrame().dataset["key"]).toBe("to");
    expect(calls.changed).toEqual([]);
  });

  it("a tap deep inside both frames picks none; one near the inner frame's border picks it", () => {
    mountEditor(view({ motion: NESTED }));

    tapAt(pagePoint(0.5, 0.5));
    expect(activeFrame().dataset["key"]).toBe("from");

    tapAt(pagePoint(0.25, 0.5, 10));
    expect(activeFrame().dataset["key"]).toBe("to");
  });

  it("a tap outside both frames changes nothing", () => {
    const { calls } = mountEditor(view({ motion: APART }));

    tapAt(pagePoint(0.95, 0.05));

    expect(activeFrame().dataset["key"]).toBe("from");
    expect(calls.changed).toEqual([]);
  });

  it("a jitter below the drag threshold neither moves the frame nor stores anything", () => {
    const zoomed = { ...AUTOMATIC, from: { zoom: 2, centerX: 0.5, centerY: 0.5 } };
    const { calls } = mountEditor(view({ motion: zoomed }));
    const before = activeFrame().getAttribute("style");
    const jitter = DRAG_THRESHOLD_PX - 2;

    downAt(pagePoint(0.5, 0.5));
    moveTo(pagePoint(0.5, 0.5, jitter, 0));
    moveTo(pagePoint(0.5, 0.5, 0, -jitter));
    expect(activeFrame().getAttribute("style")).toBe(before);
    upAt(pagePoint(0.5, 0.5, 0, -jitter));

    expect(activeFrame().getAttribute("style")).toBe(before);
    expect(calls.changed).toEqual([]);
  });

  it("a corner on the picture's edge is grabbed from just outside the picture", () => {
    const { calls } = mountEditor();
    const top = 0.125; // The 1× start frame spans the width; 16:9 on 4:3 leaves 1/8 above.

    const hit = downAt(pagePoint(0, top, -8, 0));
    expect(hit.closest("[data-corner]")?.getAttribute("data-corner")).toBe("nw");
    moveTo(pagePoint(0.2, top + 0.15));
    upAt(pagePoint(0.2, top + 0.15));

    expect(calls.changed[0]?.from.zoom).toBeGreaterThan(1);
  });
});
