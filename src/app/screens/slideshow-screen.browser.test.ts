import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import {
  buttonNamed,
  byLabel,
  details,
  mountScreen,
  PIXEL,
  press,
  selectionBar,
  tile,
  unmountScreen,
} from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

describe("SlideshowScreen editing", () => {
  it("removes a picture with its ✕ at once, without asking", () => {
    const { calls } = mountScreen();

    byLabel("Bild 2 entfernen").click();

    expect(calls.removed).toEqual(["b"]);
    expect(document.querySelector("dialog")).toBeNull();
  });

  it("keeps the last picture: its ✕ is off; Remove and Delete look off but ask, keeping the selection", () => {
    const { calls } = mountScreen(details(["a"]));
    const only = tile(1, "01.07.2025");
    only.click();
    flushSync();
    const remove = buttonNamed("Entfernen");

    expect(byLabel("Bild 1 entfernen").disabled).toBe(true);
    expect(remove.disabled).toBe(false);
    expect(remove.getAttribute("aria-disabled")).toBe("true");
    remove.click();
    flushSync();
    press(only, "Delete");

    // The editor answers both with a toast that says why the picture stays.
    expect(calls.removed).toEqual(["a", "a"]);
    expect(selectionBar()?.textContent).toContain("Bild 1 von 1");
    expect(document.body.textContent).not.toContain("Das letzte Bild bleibt.");
  });

  it("selects a tile with a tap and shows the selection bar; a second tap deselects", () => {
    mountScreen();
    const second = tile(2, "02.07.2025");

    second.click();
    flushSync();
    expect(second.getAttribute("aria-pressed")).toBe("true");
    expect(selectionBar()?.textContent).toContain("Bild 2 von 3");

    second.click();
    flushSync();
    expect(second.getAttribute("aria-pressed")).toBe("false");
    expect(selectionBar()).toBeNull();
  });

  it("moves the selected picture earlier and later from the selection bar", () => {
    const { calls } = mountScreen();
    tile(2, "02.07.2025").click();
    flushSync();

    buttonNamed("Früher").click();
    buttonNamed("Später").click();

    expect(calls.moved).toEqual([
      ["b", 0],
      ["b", 2],
    ]);
  });

  it("keeps Earlier focusable but inert for the first picture, and Later for the last", () => {
    const { calls } = mountScreen();
    tile(1, "01.07.2025").click();
    flushSync();

    const earlier = buttonNamed("Früher");
    expect(buttonNamed("Später").getAttribute("aria-disabled")).toBe("false");
    expect(earlier.getAttribute("aria-disabled")).toBe("true");
    expect(earlier.disabled).toBe(false);
    earlier.focus();
    expect(document.activeElement).toBe(earlier);
    earlier.click();
    expect(calls.moved).toEqual([]);

    tile(1, "01.07.2025").click();
    tile(3, "03.07.2025").click();
    flushSync();
    buttonNamed("Später").click();
    expect(buttonNamed("Später").getAttribute("aria-disabled")).toBe("true");
    expect(calls.moved).toEqual([]);
  });

  it("announces the selected picture's position politely, also where the count is hidden", () => {
    const { target } = mountScreen();
    // The phone layout: the screen's container is narrower than 720 px.
    target.style.containerType = "inline-size";
    target.style.width = "400px";
    tile(2, "02.07.2025").click();
    flushSync();

    const status = document.querySelector('[role="toolbar"] [aria-live="polite"]');
    expect(status?.textContent?.trim()).toBe("Bild 2 von 3");
    expect(status?.getClientRects().length).toBeGreaterThan(0);
  });

  it("removes the selected picture from the selection bar and closes the bar", () => {
    const { calls } = mountScreen();
    tile(3, "03.07.2025").click();
    flushSync();

    buttonNamed("Entfernen").click();
    flushSync();

    expect(calls.removed).toEqual(["c"]);
    expect(selectionBar()).toBeNull();
  });

  it("moves a tile with Shift+arrows, removes it with Delete, deselects with Esc", () => {
    const { calls } = mountScreen();
    const first = tile(1, "01.07.2025");
    first.focus();

    press(first, "ArrowRight", true);
    expect(calls.moved).toEqual([["a", 1]]);
    expect(selectionBar()).not.toBeNull();
    press(first, "Escape");
    expect(selectionBar()).toBeNull();
    press(first, "Delete");
    expect(calls.removed).toEqual(["a"]);
  });

  it("drops a dragged tile where the dashed mark showed it would land", () => {
    const { calls } = mountScreen();
    const items = [...document.querySelectorAll<HTMLElement>(".strip > li")];
    const [first, , third] = items as [HTMLElement, HTMLElement, HTMLElement];
    const box = third.getBoundingClientRect();
    const drag = (type: string, target: HTMLElement) => {
      target.dispatchEvent(
        new DragEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: box.right - 2,
          clientY: box.top + 2,
          dataTransfer: new DataTransfer(),
        }),
      );
      flushSync();
    };

    drag("dragstart", first);
    drag("dragover", third);
    expect(third.classList.contains("drop-after")).toBe(true);
    drag("drop", third);

    expect(calls.moved).toEqual([["a", 2]]);
    expect(third.classList.contains("drop-after")).toBe(false);
  });

  it("lets tiles be dragged with a mouse only, so touch never starts a native drag", () => {
    mountScreen(details(["a", "b"]), { mousePointer: false });
    const items = [...document.querySelectorAll<HTMLElement>(".strip > li")];

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.draggable)).toEqual([false, false]);
    unmountScreen();

    mountScreen(details(["a", "b"]), { mousePointer: true });
    const draggable = [...document.querySelectorAll<HTMLElement>(".strip > li")];
    expect(draggable.map((item) => item.draggable)).toEqual([true, true]);
  });

  it("keeps a selected tile of the last row above the selection bar, scrolled to the end", () => {
    const ids = Array.from({ length: 30 }, (_, index) => `p${index}`);
    const pictures = ids.map((id) => ({
      id,
      thumbnailUrl: PIXEL,
      capturedAt: "2025-07-01T10:00:00Z",
    }));
    mountScreen(details(ids, { pictures }));
    const last = document.querySelector<HTMLElement>(".strip > li:last-child button.pick");
    if (last === null) {
      throw new Error("no last tile");
    }
    window.scrollTo(0, document.documentElement.scrollHeight);

    last.click();
    flushSync();
    const bar = selectionBar();
    expect(bar).not.toBeNull();
    expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      bar?.getBoundingClientRect().top ?? 0,
    );

    window.scrollTo(0, document.documentElement.scrollHeight);
    expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      bar?.getBoundingClientRect().top ?? 0,
    );
  });

  it("marks the screen busy while an edit is being saved", () => {
    const { target } = mountScreen(details(["a", "b"]), { saving: true });
    expect(target.querySelector(".screen")?.getAttribute("aria-busy")).toBe("true");
    unmountScreen();

    const saved = mountScreen(details(["a", "b"]), { saving: false });
    expect(saved.target.querySelector(".screen")?.getAttribute("aria-busy")).toBe("false");
  });

  it("calls the order the user's own once it was changed", () => {
    mountScreen(details(["a", "b"], { ownOrder: true }));

    expect(document.body.textContent).toContain("Eigene Reihenfolge");
    expect(document.body.textContent).not.toContain("Nach Aufnahmedatum sortiert");
  });

  it("renames the title in place: Enter saves, Esc cancels", async () => {
    const { calls } = mountScreen();

    byLabel("Titel umbenennen").click();
    flushSync();
    const input = byLabel<HTMLInputElement>("Titel");
    expect(input.maxLength).toBe(80);
    input.value = "Seeufer";
    press(input, "Enter");
    await tick();
    expect(calls.renamed).toEqual(["Seeufer"]);

    byLabel("Titel umbenennen").click();
    flushSync();
    const again = byLabel<HTMLInputElement>("Titel");
    again.value = "Verworfen";
    press(again, "Escape");
    await tick();

    expect(calls.renamed).toEqual(["Seeufer"]);
    expect(document.querySelector('[aria-label="Titel"]')).toBeNull();
  });

  it("saves the title when the field is left", () => {
    const { calls } = mountScreen();
    byLabel("Titel umbenennen").click();
    flushSync();
    const input = byLabel<HTMLInputElement>("Titel");

    input.value = "Am Ufer";
    input.blur();
    flushSync();

    expect(calls.renamed).toEqual(["Am Ufer"]);
  });
});
