import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import {
  buttonNamed,
  details,
  mountScreen,
  press,
  unmountScreen,
} from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

/** The text as read, whitespace between elements collapsed. */
const text = (within: Element | null) => within?.textContent?.replace(/\s+/g, " ").trim() ?? "";
const portraitRow = () => {
  const row = document.querySelector<HTMLButtonElement>(".rows button.portrait");
  if (row === null) {
    throw new Error("no portrait pictures row");
  }
  return row;
};
const sheet = () => document.querySelector("dialog");
const tile = (choice: string) => {
  const found = sheet()?.querySelector<HTMLButtonElement>(
    `[role="radio"][data-choice="${choice}"]`,
  );
  if (found === null || found === undefined) {
    throw new Error(`no tile for ${choice}`);
  }
  return found;
};
const pill = () => text(sheet()?.querySelector(".state") ?? null);
const resetButton = () => buttonNamed("Zurück auf Automatisch");

function openSheet(): void {
  portraitRow().click();
  flushSync();
}

describe("SlideshowScreen, the portrait pictures row", () => {
  it("names automatic by default and the pair count", () => {
    mountScreen(details(["a", "b"], { pairCount: 2 }));

    expect(text(portraitRow())).toBe("Hochformatbilder Automatisch · 2 Paare Ändern");
  });

  it("names a single pair in the singular", () => {
    mountScreen(details(["a", "b"], { pairCount: 1 }));

    expect(text(portraitRow())).toContain("1 Paar");
  });

  it("names one at a time without a pair count", () => {
    mountScreen(details(["a", "b"], { portraitPictures: "one-at-a-time", pairCount: 0 }));

    expect(text(portraitRow())).toBe("Hochformatbilder Einzeln Ändern");
  });
});

describe("SlideshowScreen, the portrait pictures sheet", () => {
  it("opens with the three choices, automatic checked and focused", () => {
    mountScreen();

    openSheet();

    expect(sheet()?.open).toBe(true);
    expect(pill()).toBe("Vorgabe");
    expect(tile("automatic").getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(tile("automatic"));
    expect(
      ["automatic", "one-at-a-time", "fill-screen"].map((choice) => text(tile(choice))),
    ).toEqual([
      "Automatisch Zwei aufeinanderfolgende Hochformatbilder werden nebeneinander gezeigt; ein einzelnes, das ein breiter Bildschirm stark beschneiden würde, bekommt eine unscharfe Füllung.",
      "Einzeln Jedes Bild wird einzeln gezeigt; eines, das ein breiter Bildschirm stark beschneiden würde, bekommt eine unscharfe Füllung.",
      "Bildschirm füllen Jedes Bild füllt den Bildschirm wie bisher, auch wenn das Kopf oder Füße abschneidet.",
    ]);
  });

  it("opens with focus on the stored choice", () => {
    mountScreen(details(["a", "b"], { portraitPictures: "fill-screen" }));

    openSheet();

    expect(tile("fill-screen").getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(tile("fill-screen"));
    expect(pill()).toBe("Eigene Wahl");
  });

  it("stores one at a time at once", () => {
    const { calls } = mountScreen();
    openSheet();

    tile("one-at-a-time").click();
    flushSync();

    expect(calls.portraitPictureChoices).toEqual(["one-at-a-time"]);
    expect(tile("one-at-a-time").getAttribute("aria-checked")).toBe("true");
    expect(pill()).toBe("Eigene Wahl");
  });

  it("resets to automatic instead of storing a choice for it", () => {
    const { calls } = mountScreen(details(["a", "b"], { portraitPictures: "fill-screen" }));
    openSheet();

    tile("automatic").click();
    flushSync();

    expect(calls.portraitPictureResets).toBe(1);
    expect(calls.portraitPictureChoices).toEqual([]);
  });

  it("moves the choice with the arrow keys, selection following focus", () => {
    const { calls } = mountScreen();
    openSheet();

    press(tile("automatic"), "ArrowDown");

    expect(calls.portraitPictureChoices).toEqual(["one-at-a-time"]);
    expect(document.activeElement).toBe(tile("one-at-a-time"));
  });

  it("shows the note about pictures that are always shown alone", () => {
    mountScreen();
    openSheet();

    expect(text(sheet())).toContain("immer einzeln gezeigt");
  });

  it("goes back to automatic, which then looks off and says why", () => {
    const { calls } = mountScreen(details(["a", "b"], { portraitPictures: "fill-screen" }));
    openSheet();
    expect(resetButton().getAttribute("aria-disabled")).toBe("false");

    resetButton().click();
    flushSync();
    resetButton().click();

    expect(calls.portraitPictureResets).toBe(1);
    expect(pill()).toBe("Vorgabe");
    expect(resetButton().getAttribute("aria-disabled")).toBe("true");
    expect(resetButton().title).toBe("Hochformatbilder stehen schon auf Automatisch");
  });

  it("closes with Done, focus back on the row", () => {
    mountScreen();
    openSheet();

    buttonNamed("Fertig").click();
    flushSync();

    expect(portraitRow()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(portraitRow());
  });

  it("closes with Esc, focus back on the row", async () => {
    mountScreen();
    openSheet();

    await userEvent.keyboard("{Escape}");
    flushSync();
    await tick();

    expect(portraitRow()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(portraitRow());
  });

  it("closes on a tap on the scrim", () => {
    mountScreen();
    openSheet();

    sheet()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    flushSync();

    expect(portraitRow()).not.toBeNull();
    expect(sheet()).toBeNull();
  });
});
