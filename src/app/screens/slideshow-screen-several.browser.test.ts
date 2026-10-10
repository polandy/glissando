import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { HOLD_MS } from "./slideshow/tile-drag";
import {
  buttonNamed,
  byLabel,
  click,
  details,
  firePointer,
  mountScreen,
  selectionBar,
  tile,
  unmountScreen,
} from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

describe("SlideshowScreen, dragging a tile (ADR-0019)", () => {
  it("drags a tile with a mouse and drops it where the dashed mark showed", () => {
    const { calls } = mountScreen();
    const items = [...document.querySelectorAll<HTMLElement>(".strip > li")];
    const [first, , third] = items as [HTMLElement, HTMLElement, HTMLElement];
    const pick = first.querySelector<HTMLElement>(".pick");
    if (pick === null) {
      throw new Error("the first tile has no pick button");
    }
    const box = third.getBoundingClientRect();

    firePointer(pick, "pointerdown", { x: 0, y: 0, pointerType: "mouse" });
    firePointer(window, "pointermove", {
      x: box.right - 2,
      y: box.top + 2,
      pointerType: "mouse",
    });
    expect(third.classList.contains("drop-after")).toBe(true);
    firePointer(window, "pointerup");

    expect(calls.moved).toEqual([[["a"], 3]]);
    expect(third.classList.contains("drop-after")).toBe(false);
  });

  it("a click after a drop that sent its own click to no tile selects as usual", () => {
    mountScreen();
    const items = [...document.querySelectorAll<HTMLElement>(".strip > li")];
    const [first, , third] = items as [HTMLElement, HTMLElement, HTMLElement];
    const pick = first.querySelector<HTMLElement>(".pick");
    if (pick === null) {
      throw new Error("the first tile has no pick button");
    }
    const box = third.getBoundingClientRect();
    // Released over another tile, the browser sends the click to their common ancestor.
    firePointer(pick, "pointerdown", { x: 0, y: 0, pointerType: "mouse" });
    firePointer(window, "pointermove", { x: box.right - 2, y: box.top + 2, pointerType: "mouse" });
    firePointer(window, "pointerup");

    const second = tile(2, "02.07.2025");
    firePointer(second, "pointerdown", { pointerType: "mouse" });
    firePointer(window, "pointerup");
    click(second);

    expect(second.getAttribute("aria-pressed")).toBe("true");
  });

  it("drags by a touch hold once it fires, the held tile selected first", () => {
    const { calls, holdScheduler } = mountScreen();
    const items = [...document.querySelectorAll<HTMLElement>(".strip > li")];
    const [first, , third] = items as [HTMLElement, HTMLElement, HTMLElement];
    const pick = first.querySelector<HTMLElement>(".pick");
    if (pick === null) {
      throw new Error("the first tile has no pick button");
    }
    const box = third.getBoundingClientRect();

    firePointer(pick, "pointerdown", { x: 0, y: 0, pointerType: "touch" });
    holdScheduler.advance(HOLD_MS);
    flushSync();
    expect(pick.getAttribute("aria-pressed")).toBe("true");

    firePointer(window, "pointermove", {
      x: box.right - 2,
      y: box.top + 2,
      pointerType: "touch",
    });
    firePointer(window, "pointerup");

    expect(calls.moved).toEqual([[["a"], 3]]);
  });

  it("is cancelled by moving a touch past the threshold before the hold fires: it scrolls", () => {
    const { calls, holdScheduler } = mountScreen();
    const pick = tile(1, "01.07.2025");

    firePointer(pick, "pointerdown", { x: 0, y: 0, pointerType: "touch" });
    firePointer(window, "pointermove", { x: 0, y: 50, pointerType: "touch" });
    holdScheduler.advance(HOLD_MS);
    flushSync();

    expect(pick.getAttribute("aria-pressed")).toBe("false");
    expect(calls.moved).toEqual([]);
  });

  it("leaves no pending hold behind when the strip unmounts mid-press: nothing lifts later", () => {
    const { holdScheduler } = mountScreen();
    firePointer(tile(1, "01.07.2025"), "pointerdown", { pointerType: "touch" });
    expect(holdScheduler.pending).toBe(1);

    unmountScreen();

    expect(holdScheduler.pending).toBe(0);
  });

  it("stops the auto-scroll's frames when the strip unmounts mid-drag", () => {
    const { dragFrames } = mountScreen();
    firePointer(tile(1, "01.07.2025"), "pointerdown", { x: 0, y: 0, pointerType: "mouse" });
    firePointer(window, "pointermove", { x: 0, y: window.innerHeight - 1, pointerType: "mouse" });
    expect(dragFrames.hasPendingFrame).toBe(true);

    unmountScreen();

    expect(dragFrames.hasPendingFrame).toBe(false);
  });
});

describe("SlideshowScreen, selecting several", () => {
  it("'Select' starts selecting several, with nothing selected", () => {
    mountScreen(details(["a", "b", "c"]));
    const select = byLabel("Auswählen");

    select.click();
    flushSync();

    expect(select.getAttribute("aria-pressed")).toBe("true");
    expect(selectionBar()).not.toBeNull();
    expect(buttonNamed("Früher").getAttribute("aria-disabled")).toBe("true");
    expect(buttonNamed("Entfernen").getAttribute("aria-disabled")).toBe("true");
  });

  it("Ctrl-click starts selecting several, keeping the prior tile in it; Shift-click adds a range", () => {
    mountScreen(details(["a", "b", "c", "d"]));
    const first = tile(1, "01.07.2025");
    const fourth = tile(4, "04.07.2025");
    first.click();
    flushSync();

    click(tile(3, "03.07.2025"), { ctrlKey: true });
    flushSync();
    click(fourth, { shiftKey: true });
    flushSync();

    // "a" (kept from the single selection), "c" (Ctrl-clicked), and "d" (the Shift-range from "c").
    expect(selectionBar()?.textContent).toContain("3 ausgewählt");
  });

  it("hides Edit once a second picture joins the selection", () => {
    mountScreen(details(["a", "b", "c"]));
    const first = tile(1, "01.07.2025");
    first.click();
    flushSync();
    expect(buttonNamed("Bearbeiten")).toBeDefined();

    click(tile(2, "02.07.2025"), { ctrlKey: true });
    flushSync();

    expect(() => buttonNamed("Bearbeiten")).toThrow();
  });

  it("removes the whole selection with Remove", () => {
    const { calls } = mountScreen(details(["a", "b", "c", "d"]));
    tile(1, "01.07.2025").click();
    flushSync();
    click(tile(3, "03.07.2025"), { ctrlKey: true });
    flushSync();

    buttonNamed("Entfernen").click();

    expect(calls.removedGroup).toEqual([["a", "c"]]);
  });

  it("gathers a scattered selection with Earlier, as one block", () => {
    const { calls } = mountScreen(details(["a", "b", "c", "d"]));
    tile(1, "01.07.2025").click();
    flushSync();
    click(tile(3, "03.07.2025"), { ctrlKey: true });
    flushSync();

    buttonNamed("Früher").click();

    expect(calls.shifted).toEqual([[["a", "c"], -1]]);
  });
});
