import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { buttonNamed, details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

/** The text as read, whitespace between elements collapsed. */
const text = (within: Element | null) => within?.textContent?.replace(/\s+/g, " ").trim() ?? "";
const lookRow = () => {
  const row = document.querySelector<HTMLButtonElement>(".rows button.look");
  if (row === null) {
    throw new Error("no look row");
  }
  return row;
};
const sheet = () => document.querySelector("dialog");
const tile = (look: string) => {
  const found = sheet()?.querySelector<HTMLButtonElement>(`[role="radio"][data-look="${look}"]`);
  if (found === null || found === undefined) {
    throw new Error(`no tile for ${look}`);
  }
  return found;
};
const chip = () => text(lookRow().querySelector(".chip") ?? null);
const pill = () => text(sheet()?.querySelector(".state") ?? null);
const resetButton = () => buttonNamed("Zurück auf Kein");

function openSheet(): void {
  lookRow().click();
  flushSync();
}

describe("SlideshowScreen, the look row", () => {
  it("names None and offers to change it, plain", () => {
    mountScreen();

    expect(text(lookRow())).toBe("Look Ohne Ändern");
    expect(lookRow().querySelector(".chip")?.classList.contains("own")).toBe(false);
  });

  it("names the chosen look as the slideshow's own choice", () => {
    mountScreen(details(["a"], { look: "warm" }));

    expect(chip()).toBe("Warm");
    expect(lookRow().querySelector(".chip")?.classList.contains("own")).toBe(true);
  });
});

describe("SlideshowScreen, the look sheet", () => {
  it("opens over the screen with None checked and tagged", () => {
    mountScreen();

    openSheet();

    expect(sheet()?.open).toBe(true);
    expect(pill()).toBe("Ohne");
    expect(tile("none").getAttribute("aria-checked")).toBe("true");
    expect(tile("none").querySelector(".tag")?.textContent).toBe("Standard");
  });

  it("stores a picked look at once and shows it as the slideshow's own choice", () => {
    const { calls } = mountScreen();
    openSheet();

    tile("vivid").click();
    flushSync();

    expect(calls.looks).toEqual(["vivid"]);
    expect(pill()).toBe("Kräftig");
    expect(tile("vivid").getAttribute("aria-checked")).toBe("true");
    expect(chip()).toBe("Kräftig");
  });

  it("goes back to None, which then looks off and says why", () => {
    const { calls } = mountScreen(details(["a"], { look: "cool" }));
    openSheet();
    expect(resetButton().getAttribute("aria-disabled")).toBe("false");

    resetButton().click();
    flushSync();
    resetButton().click();

    expect(calls.lookResets).toBe(1);
    expect(pill()).toBe("Ohne");
    expect(resetButton().getAttribute("aria-disabled")).toBe("true");
    expect(resetButton().title).toBe("Die Diashow hat keinen Look");
    expect(chip()).toBe("Ohne");
  });

  it("closes with Done, focus back on the row", () => {
    mountScreen();
    openSheet();

    buttonNamed("Fertig").click();
    flushSync();

    expect(lookRow()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(lookRow());
  });

  it("closes with Esc, focus back on the row", async () => {
    mountScreen();
    openSheet();

    await userEvent.keyboard("{Escape}");
    flushSync();
    await tick();

    expect(lookRow()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(lookRow());
  });

  it("closes on a tap on the scrim, focus back on the row", () => {
    mountScreen();
    openSheet();

    sheet()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    flushSync();

    expect(lookRow()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(lookRow());
  });
});
