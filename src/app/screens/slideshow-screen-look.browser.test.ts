import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { buttonNamed, details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

/** The text as read, whitespace between elements collapsed. */
const text = (within: Element | null) => within?.textContent?.replace(/\s+/g, " ").trim() ?? "";
const lookTile = () => {
  const found = document.querySelector<HTMLButtonElement>(".tiles button.look");
  if (found === null) {
    throw new Error("no look tile");
  }
  return found;
};
const sheet = () => document.querySelector("dialog");
const tile = (look: string) => {
  const found = sheet()?.querySelector<HTMLButtonElement>(`[role="radio"][data-look="${look}"]`);
  if (found === null || found === undefined) {
    throw new Error(`no tile for ${look}`);
  }
  return found;
};
const lookValue = () => text(lookTile().querySelector(".value b") ?? null);
const lookSummary = () => text(lookTile().querySelector(".value small") ?? null);
const pill = () => text(sheet()?.querySelector(".state") ?? null);
const resetButton = () => buttonNamed("Look entfernen");

function openSheet(): void {
  lookTile().click();
  flushSync();
}

describe("SlideshowScreen, the look tile", () => {
  it("names None as plain text and says it is the default", () => {
    mountScreen();

    expect(lookValue()).toBe("Ohne");
    expect(lookSummary()).toBe("Automatisch");
    expect(text(lookTile())).toBe("Look Ohne Automatisch");
  });

  it("names the chosen look as plain text, with no summary", () => {
    mountScreen(details(["a"], { look: "warm" }));

    expect(lookValue()).toBe("Warm");
    expect(lookSummary()).toBe("");
  });
});

describe("SlideshowScreen, the look sheet", () => {
  it("opens over the screen with None checked and tagged", () => {
    mountScreen();

    openSheet();

    expect(sheet()?.open).toBe(true);
    expect(pill()).toBe("Ohne");
    expect(tile("none").getAttribute("aria-checked")).toBe("true");
    expect(tile("none").querySelector(".tag")?.textContent).toBe("Automatisch");
  });

  it("stores a picked look at once and shows it as the slideshow's own choice", () => {
    const { calls } = mountScreen();
    openSheet();

    tile("vivid").click();
    flushSync();

    expect(calls.looks).toEqual(["vivid"]);
    expect(pill()).toBe("Kräftig");
    expect(tile("vivid").getAttribute("aria-checked")).toBe("true");
    expect(lookValue()).toBe("Kräftig");
    expect(lookSummary()).toBe("");
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
    expect(lookValue()).toBe("Ohne");
    expect(lookSummary()).toBe("Automatisch");
  });

  it("closes with Done, focus back on the tile", () => {
    mountScreen();
    openSheet();

    buttonNamed("Fertig").click();
    flushSync();

    expect(lookTile()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(lookTile());
  });

  it("closes with Esc, focus back on the tile", async () => {
    mountScreen();
    openSheet();

    await userEvent.keyboard("{Escape}");
    flushSync();
    await tick();

    expect(lookTile()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(lookTile());
  });

  it("closes on a tap on the scrim, focus back on the tile", () => {
    mountScreen();
    openSheet();

    sheet()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    flushSync();

    expect(lookTile()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(lookTile());
  });
});
