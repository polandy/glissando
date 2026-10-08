import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { layerTransform } from "../../player";
import { cropRect, framingAt } from "../../player/ken-burns";
import {
  AUTOMATIC,
  button,
  element,
  mountEditor,
  press,
  unmountEditor,
  view,
} from "./picture-editor-harness";

afterEach(() => unmountEditor());

const activeFrame = () => element(".frame.active");
const toggle = (key: "from" | "to") => element<HTMLButtonElement>(`.keys [data-key="${key}"]`);

/** A transform as the browser writes it back, so number formatting cannot differ. */
function normalised(transform: string): string {
  const probe = document.createElement("div");
  probe.style.transform = transform;
  return probe.style.transform;
}

describe("PictureEditorScreen", () => {
  it("names the picture in the breadcrumb and the panel, with its file name and date", () => {
    mountEditor();

    expect(element("nav").textContent).toContain("Sommer am See");
    expect(element('[aria-current="page"]').textContent).toBe("Bild 2");
    expect(element(".who").textContent).toContain("Bild 2 von 3");
    expect(element(".who").textContent).toContain("b.jpg · 02.07.2025");
  });

  it("calls an untouched motion Automatic; Back to automatic looks off and says why", () => {
    const { calls } = mountEditor();
    const reset = button("Zurück auf automatisch");

    reset.click();

    expect(element(".state").textContent?.trim()).toBe("Automatisch");
    expect(reset.getAttribute("aria-disabled")).toBe("true");
    expect(reset.title).toBe("Die Bewegung ist schon automatisch");
    expect(calls.resets).toBe(0);
  });

  it("calls an own motion so; Back to automatic resets it", () => {
    const { calls } = mountEditor(view({ ownMotion: true }));

    button("Zurück auf automatisch").click();

    expect(element(".state").textContent?.trim()).toBe("Eigene Bewegung");
    expect(calls.resets).toBe(1);
  });

  it("starts with the start frame active and the end frame dashed beside it", () => {
    mountEditor();

    expect(activeFrame().dataset["key"]).toBe("from");
    expect(activeFrame().querySelectorAll(".handle")).toHaveLength(4);
    expect(document.querySelectorAll(".frame")).toHaveLength(2);
    expect(toggle("from").getAttribute("aria-pressed")).toBe("true");
    expect(toggle("from").textContent).toContain("Zoom 1,00×");
    expect(toggle("to").textContent).toContain("Zoom 1,20×");
  });

  it("makes the end frame active with the toggle or by tapping its label", () => {
    mountEditor();

    toggle("to").click();
    flushSync();
    expect(activeFrame().dataset["key"]).toBe("to");

    button("Startrahmen bearbeiten").dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, isPrimary: true }),
    );
    flushSync();
    expect(activeFrame().dataset["key"]).toBe("from");
  });

  it("moves the focused frame by 1 % with an arrow key, 5 % with Shift, and zooms with + and −", () => {
    const zoomed = { ...AUTOMATIC, from: { zoom: 2, centerX: 0.5, centerY: 0.5 } };
    const { calls } = mountEditor(view({ motion: zoomed }));

    press(activeFrame(), "ArrowRight");
    press(activeFrame(), "ArrowDown", true);
    press(activeFrame(), "+");

    expect(calls.changed[0]?.from.centerX).toBeCloseTo(0.51);
    expect(calls.changed[1]?.from.centerY).toBeCloseTo(0.55);
    expect(calls.changed[2]?.from.zoom).toBeCloseTo(2.05);
    expect(calls.changed.every((motion) => motion.to === zoomed.to)).toBe(true);
  });

  it("drags the active frame inside the picture and stores the motion once, on release", () => {
    const zoomed = { ...AUTOMATIC, from: { zoom: 2, centerX: 0.5, centerY: 0.5 } };
    const { calls } = mountEditor(view({ motion: zoomed }));
    const picture = element(".pic").getBoundingClientRect();
    const at = (x: number, y: number) => ({
      bubbles: true,
      isPrimary: true,
      pointerId: 1,
      clientX: picture.left + x * picture.width,
      clientY: picture.top + y * picture.height,
    });

    activeFrame().dispatchEvent(new PointerEvent("pointerdown", at(0.5, 0.5)));
    window.dispatchEvent(new PointerEvent("pointermove", at(0.6, 0.55)));
    window.dispatchEvent(new PointerEvent("pointermove", at(0.7, 0.6)));
    flushSync();
    expect(calls.changed).toEqual([]);
    window.dispatchEvent(new PointerEvent("pointerup", at(0.7, 0.6)));

    expect(calls.changed).toHaveLength(1);
    expect(calls.changed[0]?.from.centerX).toBeCloseTo(0.7);
    expect(calls.changed[0]?.from.centerY).toBeCloseTo(0.6);
  });

  describe("picking a frame by tapping inside it", () => {
    /** Start top left, end bottom right, overlapping in the middle (4:3 picture). */
    const apart = {
      from: { zoom: 2, centerX: 0.3, centerY: 0.35 },
      to: { zoom: 2, centerX: 0.7, centerY: 0.65 },
    };
    function pointerAt(x: number, y: number, pointerId = 1) {
      const picture = element(".pic").getBoundingClientRect();
      return {
        bubbles: true,
        isPrimary: true,
        pointerId,
        clientX: picture.left + x * picture.width,
        clientY: picture.top + y * picture.height,
      };
    }

    it("a tap inside the inactive frame only makes it active, and a drag goes on moving it", () => {
      const { calls } = mountEditor(view({ motion: apart }));

      element(".pic").dispatchEvent(new PointerEvent("pointerdown", pointerAt(0.85, 0.8)));
      flushSync();
      expect(activeFrame().dataset["key"]).toBe("to");
      window.dispatchEvent(new PointerEvent("pointermove", pointerAt(0.8, 0.75)));
      window.dispatchEvent(new PointerEvent("pointerup", pointerAt(0.8, 0.75)));

      expect(calls.changed).toHaveLength(1);
      expect(calls.changed[0]?.to.centerX).toBeCloseTo(0.65);
      expect(calls.changed[0]?.from).toEqual(apart.from);
    });

    it("where both frames overlap, the active frame keeps the gesture", () => {
      const { calls } = mountEditor(view({ motion: apart }));

      activeFrame().dispatchEvent(new PointerEvent("pointerdown", pointerAt(0.5, 0.5)));
      flushSync();
      window.dispatchEvent(new PointerEvent("pointermove", pointerAt(0.45, 0.45)));
      window.dispatchEvent(new PointerEvent("pointerup", pointerAt(0.45, 0.45)));

      expect(activeFrame().dataset["key"]).toBe("from");
      expect(calls.changed[0]?.from.centerX).toBeCloseTo(0.25);
      expect(calls.changed[0]?.to).toEqual(apart.to);
    });

    it("a tap outside both frames changes nothing", () => {
      const { calls } = mountEditor(view({ motion: apart }));

      element(".pic").dispatchEvent(new PointerEvent("pointerdown", pointerAt(0.95, 0.05)));
      window.dispatchEvent(new PointerEvent("pointerup", pointerAt(0.95, 0.05)));
      flushSync();

      expect(activeFrame().dataset["key"]).toBe("from");
      expect(calls.changed).toEqual([]);
    });
  });

  it("opens the previous and next picture, and looks off at the ends", () => {
    const { calls } = mountEditor(view({ previousId: null, nextId: "c" }));

    button("Vorheriges Bild").click();
    button("Nächstes Bild").click();

    expect(button("Vorheriges Bild").getAttribute("aria-disabled")).toBe("true");
    expect(calls.opened).toEqual(["c"]);
  });

  it("swaps start and end", () => {
    const { calls } = mountEditor();

    button("Start und Ende tauschen").click();

    expect(calls.swaps).toBe(1);
  });

  it("plays the motion over the slide's duration, showing just what the player shows", () => {
    const { advance } = mountEditor();

    advance(2500);

    const screen = element(".preview");
    const viewport = { width: screen.clientWidth, height: screen.clientHeight };
    const size = { width: 400, height: 300 };
    const framing = framingAt({ ...AUTOMATIC, easing: "linear" }, 0.5);
    expect(element<HTMLImageElement>(".preview img").style.transform).toBe(
      normalised(layerTransform(cropRect(framing, size, viewport), size, viewport)),
    );
    expect(element(".preview-time").textContent).toBe("0:02,5 / 0:05,0");
  });

  it("pauses on the end when the end frame is edited", () => {
    const { advance } = mountEditor();
    advance(1000);
    toggle("to").click();
    flushSync();

    press(activeFrame(), "-");

    expect(element(".preview-time").textContent).toBe("0:05,0 / 0:05,0");
    expect(button("Vorschau abspielen")).toBeDefined();
  });

  it("with reduced motion, starts the preview paused", () => {
    const { frames } = mountEditor(view(), { reducedMotion: true });

    expect(button("Vorschau abspielen")).toBeDefined();
    expect(element(".preview-time").textContent).toBe("0:00,0 / 0:05,0");
    expect(frames.hasPendingFrame).toBe(false);
  });
});
