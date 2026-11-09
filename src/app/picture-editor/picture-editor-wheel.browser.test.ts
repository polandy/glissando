import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { WHEEL_REST_MS } from "./framing-step";
import {
  AUTOMATIC,
  button,
  element,
  mountEditor,
  unmountEditor,
  view,
} from "./picture-editor-harness";
// The app's layout, so the frames have their real size on the picture.
import "../../styles/tokens.css";
import "../../styles/base.css";

afterEach(() => unmountEditor());

/** A wheel notch rolled away from the user: the active frame zooms in. */
const ZOOM_IN_DELTA = -100;

const activeFrameWidth = () => element(".frame.active").getBoundingClientRect().width;

function wheelTick(): void {
  element(".pic").dispatchEvent(
    new WheelEvent("wheel", { deltaY: ZOOM_IN_DELTA, bubbles: true, cancelable: true }),
  );
  flushSync();
}

function pointer(type: string, x: number, y: number): void {
  const picture = element(".pic").getBoundingClientRect();
  const init = {
    bubbles: true,
    isPrimary: true,
    pointerId: 1,
    clientX: picture.left + x * picture.width,
    clientY: picture.top + y * picture.height,
  };
  const at = type === "pointerdown" ? element(".pic") : window;
  at.dispatchEvent(new PointerEvent(type, init));
  flushSync();
}

describe("picture editor wheel zoom", () => {
  it("zooms the frame on every tick and stores the motion once, after the wheel rests", () => {
    const { calls, scheduler } = mountEditor();
    const startWidth = activeFrameWidth();

    wheelTick();
    wheelTick();
    scheduler.advance(WHEEL_REST_MS - 1);
    wheelTick();
    expect(activeFrameWidth()).toBeLessThan(startWidth);
    scheduler.advance(WHEEL_REST_MS - 1);
    expect(calls.changed).toEqual([]);

    scheduler.advance(1);
    flushSync();

    expect(calls.changed).toHaveLength(1);
    expect(calls.changed[0]?.from.zoom).toBeGreaterThan(AUTOMATIC.from.zoom);
    expect(calls.changed[0]?.to).toEqual(AUTOMATIC.to);
  });

  it("swap stores the zoom still waiting for the wheel to rest first", () => {
    const { calls, scheduler } = mountEditor();

    wheelTick();
    button("Start und Ende tauschen").click();
    flushSync();

    expect(calls.motionEdits).toEqual(["change", "swap"]);
    expect(calls.changed[0]?.from.zoom).toBeGreaterThan(AUTOMATIC.from.zoom);
    expect(scheduler.pending).toBe(0);
  });

  it("Back to automatic stores the waiting zoom first, so its undo brings the zoom back", () => {
    const { calls } = mountEditor(view({ ownMotion: true }));

    wheelTick();
    button("Zurück auf automatisch").click();
    flushSync();

    expect(calls.motionEdits).toEqual(["change", "reset"]);
  });

  it("a drag after the wheel stores both in one edit, on release, however long it is held", () => {
    const { calls, scheduler } = mountEditor();

    wheelTick();
    pointer("pointerdown", 0.5, 0.5);
    pointer("pointermove", 0.6, 0.55);
    scheduler.advance(WHEEL_REST_MS);
    flushSync();
    expect(calls.changed).toEqual([]);
    pointer("pointerup", 0.6, 0.55);

    expect(calls.changed).toHaveLength(1);
    expect(calls.changed[0]?.from.zoom).toBeGreaterThan(AUTOMATIC.from.zoom);
    expect(calls.changed[0]?.from.centerX).toBeGreaterThan(AUTOMATIC.from.centerX);
  });

  it("leaving the editor stores the waiting zoom for the picture it showed", () => {
    const { calls, scheduler } = mountEditor(view({ id: "b" }));

    wheelTick();
    unmountEditor();

    expect(calls.changedPictureIds).toEqual(["b"]);
    expect(calls.changed[0]?.from.zoom).toBeGreaterThan(AUTOMATIC.from.zoom);
    expect(scheduler.pending).toBe(0);
  });
});
