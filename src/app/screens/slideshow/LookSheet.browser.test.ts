import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createTranslator } from "../../i18n/translator";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { reactiveProps } from "../../testing/reactive-props.svelte";
import type { PictureTile, SlideshowDetails } from "../view-models";
import LookSheet from "./LookSheet.svelte";

// A generated 1×1 pixel: no real picture is used in this test (CLAUDE.md).
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function picture(id: string, overrides: Partial<PictureTile> = {}): PictureTile {
  return {
    id,
    thumbnailUrl: PIXEL,
    capturedAt: "2025-07-01T10:00:00Z",
    ownMotion: false,
    ownDurationMs: null,
    ownTransition: null,
    pairedWithNumber: null,
    blurredFill: false,
    alone: false,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    ...overrides,
  };
}

function details(
  ids: readonly string[],
  overrides: Partial<SlideshowDetails> = {},
): SlideshowDetails {
  return {
    title: "Sommer am See",
    coverUrl: PIXEL,
    durationSeconds: 60,
    songCount: 0,
    musicTitle: null,
    musicSeconds: null,
    musicSummary: null,
    ownOrder: false,
    automaticChaptersOff: false,
    chapters: [],
    ownMotionCount: 0,
    ownDurationCount: 0,
    ownTransitionCount: 0,
    transition: "crossfade",
    energyPacing: false,
    look: "none",
    portraitPictures: "automatic",
    pairCount: 0,
    captionCount: 0,
    capturedFrom: "2025-07-01T10:00:00Z",
    capturedTo: "2025-07-03T10:00:00Z",
    pictures: ids.map((id, index) =>
      picture(id, { capturedAt: `2025-07-0${index + 1}T10:00:00Z` }),
    ),
    ...overrides,
  };
}

const text = (within: Element | null) => within?.textContent?.replace(/\s+/g, " ").trim() ?? "";
const dialog = () => document.querySelector("dialog");
function tile(look: string): HTMLButtonElement {
  const found = dialog()?.querySelector<HTMLButtonElement>(`[role="radio"][data-look="${look}"]`);
  if (found === null || found === undefined) {
    throw new Error(`no tile for ${look}`);
  }
  return found;
}
const pill = () => text(dialog()?.querySelector(".state") ?? null);
const resetButton = () => dialog()?.querySelector<HTMLButtonElement>("footer .ghost") ?? null;
const doneButton = () => dialog()?.querySelector<HTMLButtonElement>("footer .primary") ?? null;
const holdButton = () => dialog()?.querySelector<HTMLButtonElement>(".hold") ?? null;
const previewImg = () => dialog()?.querySelector<HTMLImageElement>(".preview img") ?? null;
const pictureRowButtons = () => [...(dialog()?.querySelectorAll<HTMLButtonElement>(".pick") ?? [])];

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function setUp(slideshow: SlideshowDetails, english = false) {
  const onLook = vi.fn((look: SlideshowDetails["look"]) => {
    props.slideshow = { ...props.slideshow, look };
  });
  const onReset = vi.fn(() => {
    props.slideshow = { ...props.slideshow, look: "none" };
  });
  const onClose = vi.fn();
  const props = reactiveProps({ slideshow, onLook, onReset, onClose });
  const mounted = mountWithTranslator(
    LookSheet,
    props,
    english ? { current: createTranslator("en") } : undefined,
  );
  destroy = mounted.destroy;
  return { target: mounted.target, onLook, onReset, onClose };
}

describe("LookSheet", () => {
  it("opens with the seven tiles, None tagged Default, focus on the checked tile", () => {
    setUp(details(["a", "b"]));

    expect(dialog()?.open).toBe(true);
    const radios = [...(dialog()?.querySelectorAll('[role="radio"]') ?? [])];
    expect(radios.map((radio) => radio.getAttribute("data-look"))).toEqual([
      "none",
      "warm",
      "cool",
      "vivid",
      "film",
      "black-and-white",
      "faded",
    ]);
    expect(tile("none").querySelector(".tag")?.textContent).toBe("Standard");
    expect(dialog()?.querySelectorAll(".tag")).toHaveLength(1);
    expect(tile("none").getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(tile("none"));
    expect(pill()).toBe("Ohne");
  });

  it("shows German strings by default and English when asked", () => {
    setUp(details(["a", "b"]));
    expect(text(dialog()?.querySelector("#look-title") ?? null)).toBe("Look");
    expect(text(dialog())).toContain("Look entfernen");

    destroy?.();
    setUp(details(["a", "b"]), true);
    expect(text(dialog())).toContain("Back to None");
  });

  it("stores a tapped look at once and shows it as checked", () => {
    const { onLook } = setUp(details(["a", "b"]));

    tile("warm").click();
    flushSync();

    expect(onLook).toHaveBeenCalledWith("warm");
    expect(tile("warm").getAttribute("aria-checked")).toBe("true");
    expect(tile("none").getAttribute("aria-checked")).toBe("false");
    expect(pill()).toBe("Warm");
  });

  it("moves the checked tile with the arrow keys, selection following focus", () => {
    const { onLook } = setUp(details(["a", "b"]));

    tile("none").focus();
    tile("none").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );
    flushSync();

    expect(onLook).toHaveBeenCalledWith("warm");
    expect(document.activeElement).toBe(tile("warm"));
    expect(tile("warm").getAttribute("aria-checked")).toBe("true");
  });

  it("looks off the reset button with a title while already None, resets otherwise", () => {
    const { onReset } = setUp(details(["a", "b"], { look: "warm" }));
    expect(resetButton()?.getAttribute("aria-disabled")).toBe("false");

    resetButton()?.click();
    flushSync();

    expect(onReset).toHaveBeenCalledOnce();
    expect(resetButton()?.getAttribute("aria-disabled")).toBe("true");
    expect(resetButton()?.title).toBe("Die Diashow hat keinen Look");

    resetButton()?.click();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("closes with Done, Esc and a tap on the scrim", async () => {
    const { onClose } = setUp(details(["a", "b"]));

    doneButton()?.click();
    expect(onClose).toHaveBeenCalledTimes(1);

    dialog()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(2);

    await userEvent.keyboard("{Escape}");
    flushSync();
    await tick();
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("holding the compare button shows the original, releasing restores the look", () => {
    setUp(details(["a", "b"], { look: "warm" }));

    const filtered = previewImg()?.style.filter;
    expect(filtered).not.toBe("");

    holdButton()?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    flushSync();
    expect(previewImg()?.style.filter).toBe("");
    expect(text(dialog())).toContain("Original");

    holdButton()?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    flushSync();
    expect(previewImg()?.style.filter).toBe(filtered);
    expect(text(dialog())).not.toContain("Original");
  });

  it("holds the compare with Space and Enter held too", () => {
    setUp(details(["a", "b"], { look: "warm" }));
    const filtered = previewImg()?.style.filter;

    holdButton()?.focus();
    holdButton()?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );
    flushSync();
    expect(previewImg()?.style.filter).toBe("");

    holdButton()?.dispatchEvent(
      new KeyboardEvent("keyup", { key: "Enter", bubbles: true, cancelable: true }),
    );
    flushSync();
    expect(previewImg()?.style.filter).toBe(filtered);
  });

  it("has no compare button for None, which has nothing to compare against", () => {
    setUp(details(["a", "b"]));

    expect(holdButton()).toBeNull();
  });

  it("offers the picture row only with two or more pictures, and switches the preview", () => {
    setUp(details(["a"]));
    expect(pictureRowButtons()).toHaveLength(0);

    destroy?.();
    setUp(details(["a", "b", "c"]));
    const buttons = pictureRowButtons();
    expect(buttons).toHaveLength(3);
    expect(buttons.map((button) => button.getAttribute("aria-current"))).toEqual([
      "true",
      "false",
      "false",
    ]);

    buttons[1]?.click();
    flushSync();

    expect(pictureRowButtons().map((button) => button.getAttribute("aria-current"))).toEqual([
      "false",
      "true",
      "false",
    ]);
  });

  it("leaves out the preview and the row, and shows plain swatches, without pictures", () => {
    setUp(details([]));

    expect(dialog()?.querySelector(".preview")).toBeNull();
    expect(pictureRowButtons()).toHaveLength(0);
    expect(tile("warm").querySelector("img")).toBeNull();
    expect(tile("warm").textContent).toContain("Warm");
  });
});
