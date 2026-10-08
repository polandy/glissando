import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../testing/mount-with-translator";
import SlideshowScreen from "./SlideshowScreen.svelte";
import type { SlideshowDetails } from "./view-models";

let destroy = () => {};
afterEach(() => destroy());

// A transparent pixel stands in for every thumbnail.
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function details(ids: readonly string[], overrides: Partial<SlideshowDetails> = {}) {
  const base: SlideshowDetails = {
    title: "Sommer am See",
    coverUrl: PIXEL,
    durationSeconds: 60,
    musicTitle: null,
    ownOrder: false,
    capturedFrom: "2025-07-01T10:00:00Z",
    capturedTo: "2025-07-03T10:00:00Z",
    pictures: ids.map((id, index) => ({
      id,
      thumbnailUrl: PIXEL,
      capturedAt: `2025-07-0${index + 1}T10:00:00Z`,
    })),
  };
  return { ...base, ...overrides };
}

function mountScreen(slideshow: SlideshowDetails = details(["a", "b", "c"])) {
  const calls = {
    removed: [] as string[],
    moved: [] as [string, number][],
    renamed: [] as string[],
    deletes: 0,
  };
  const mounted = mountWithTranslator(SlideshowScreen, {
    slideshow,
    onBack: () => {},
    onPlay: () => {},
    onRemove: (pictureId: string) => calls.removed.push(pictureId),
    onMove: (pictureId: string, toIndex: number) => calls.moved.push([pictureId, toIndex]),
    onRename: (typed: string) => calls.renamed.push(typed),
    onDelete: () => (calls.deletes += 1),
  });
  destroy = mounted.destroy;
  return { target: mounted.target, calls };
}

function byLabel<T extends HTMLElement = HTMLButtonElement>(label: string): T {
  const found = document.querySelector<T>(`[aria-label="${label}"]`);
  if (found === null) {
    throw new Error(`nothing labelled "${label}"`);
  }
  return found;
}

function buttonNamed(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === name,
  );
  if (found === undefined) {
    throw new Error(`no button named "${name}"`);
  }
  return found;
}

/** A tile's button, named by its picture's description. */
function tile(number: number, date: string): HTMLButtonElement {
  const picture = document.querySelector(`img[alt="Bild ${number}, aufgenommen am ${date}"]`);
  const button = picture?.closest("button");
  if (button === null || button === undefined) {
    throw new Error(`no tile for picture ${number}`);
  }
  return button;
}
const selectionBar = () => document.querySelector('[role="toolbar"]');

function press(target: HTMLElement, key: string, shiftKey = false): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }));
  flushSync();
}

describe("SlideshowScreen editing", () => {
  it("removes a picture with its ✕ at once, without asking", () => {
    const { calls } = mountScreen();

    byLabel("Bild 2 entfernen").click();

    expect(calls.removed).toEqual(["b"]);
    expect(document.querySelector("dialog")).toBeNull();
  });

  it("keeps the last picture: no ✕, no Remove, and a hint why", () => {
    mountScreen(details(["a"]));

    tile(1, "01.07.2025").click();
    flushSync();

    expect(byLabel("Bild 1 entfernen").disabled).toBe(true);
    expect(buttonNamed("Entfernen").disabled).toBe(true);
    expect(document.body.textContent).toContain(
      "Das letzte Bild bleibt. Zum Wegwerfen die ganze Diashow löschen.",
    );
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

  it("offers no Earlier for the first picture", () => {
    mountScreen();
    tile(1, "01.07.2025").click();
    flushSync();

    expect(buttonNamed("Später").disabled).toBe(false);
    expect(buttonNamed("Früher").disabled).toBe(true);
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

describe("SlideshowScreen deleting", () => {
  function openDeleteDialog(): HTMLDialogElement {
    byLabel("Mehr").click();
    flushSync();
    const items = [...document.querySelectorAll('[role="menuitem"]')];
    expect(items.map((item) => item.textContent?.trim())).toEqual(["Diashow löschen …"]);
    (items[0] as HTMLElement).click();
    flushSync();
    const dialog = document.querySelector("dialog");
    if (dialog === null) {
      throw new Error("no dialog opened");
    }
    return dialog;
  }

  it("asks first, naming the slideshow and its pictures, with Keep focused", () => {
    mountScreen();

    const dialog = openDeleteDialog();

    expect(dialog.querySelector("h3")?.textContent).toBe("„Sommer am See“ löschen?");
    expect(dialog.textContent).toContain("Die Diashow und ihre 3 Bilder werden");
    expect(document.activeElement?.textContent?.trim()).toBe("Behalten");
  });

  it("keeps the slideshow when the user says Keep", () => {
    const { calls } = mountScreen();
    openDeleteDialog();

    buttonNamed("Behalten").click();
    flushSync();

    expect(byLabel("Mehr")).not.toBeNull();
    expect(document.querySelector("dialog")).toBeNull();
    expect(calls.deletes).toBe(0);
  });

  it("deletes the slideshow when the user says Delete", () => {
    const { calls } = mountScreen();
    openDeleteDialog();

    buttonNamed("Löschen").click();
    flushSync();

    expect(calls.deletes).toBe(1);
  });
});
