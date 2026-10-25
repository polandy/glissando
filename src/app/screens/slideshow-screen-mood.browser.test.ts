import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { buttonNamed, details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

/** The text as read, whitespace between elements collapsed. */
const text = (within: Element | null) => within?.textContent?.replace(/\s+/g, " ").trim() ?? "";
const moodRow = () => {
  const row = document.querySelector<HTMLButtonElement>(".rows button.mood");
  if (row === null) {
    throw new Error("no mood row");
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
const moodValue = () => text(moodRow().querySelector(".value b") ?? null);
const moodRowSummary = () => text(moodRow().querySelector(".value small") ?? null);
const resetButton = () => buttonNamed("Zurück auf Eigene");
const factRow = (dt: string) =>
  Array.from(document.querySelectorAll(".rows > div")).find(
    (row) => text(row.querySelector("dt")) === dt,
  ) ?? null;
const factRowSummary = (dt: string) => text(factRow(dt)?.querySelector("dd small") ?? null);
const factRowValue = (dt: string) => text(factRow(dt)?.querySelector(".pill") ?? null);

function openSheet(): void {
  moodRow().click();
  flushSync();
}

describe("SlideshowScreen, the mood row", () => {
  it("names Custom and says it is the default", () => {
    mountScreen();

    expect(moodValue()).toBe("Eigene");
    expect(moodRowSummary()).toBe("Vorgabe");
  });

  it("names the stored mood as plain text, with no summary", () => {
    mountScreen(details(["a"], { mood: "calm" }));

    expect(moodValue()).toBe("Ruhig");
    expect(moodRowSummary()).toBe("");
  });

  it("paces picture times and Ken Burns to the mood instead of the slideshow's own settings", () => {
    mountScreen(details(["a"], { mood: "calm" }), { moodBpm: 80 });

    expect(factRowSummary("Bildzeiten")).toBe("nach Stimmung");
    expect(factRowSummary("Ken Burns")).toBe("nach Stimmung");
  });

  it("shows the energy pacing's found range under a mood, instead of the mood's own text", () => {
    mountScreen(details(["a"], { mood: "calm" }), {
      moodBpm: 80,
      moodEnergyPacing: { minMs: 5000, maxMs: 10_000, firstLiftUnitIndex: undefined },
    });

    expect(factRowValue("Bildzeiten")).toBe("5 s – 10 s · nach Energie");
  });

  it("keeps Custom's picture times without a note once the energy pacing is on", () => {
    mountScreen(details(["a"], { energyPacing: true }), {
      moodEnergyPacing: { minMs: 5000, maxMs: 10_000, firstLiftUnitIndex: undefined },
    });

    expect(factRowValue("Bildzeiten")).toBe("automatisch");
    expect(factRowSummary("Bildzeiten")).toBe("");
  });
});

describe("SlideshowScreen, the mood sheet", () => {
  it("opens over the screen with Custom checked", () => {
    mountScreen();

    openSheet();

    expect(sheet()?.open).toBe(true);
    expect(tile("custom").getAttribute("aria-checked")).toBe("true");
  });

  it("stores a tapped tile at once and shows it as the slideshow's own mood", () => {
    const { calls } = mountScreen();
    openSheet();

    tile("lively").click();
    flushSync();

    expect(calls.moods).toEqual(["lively"]);
    expect(tile("lively").getAttribute("aria-checked")).toBe("true");
    expect(moodValue()).toBe("Lebhaft");
    expect(moodRowSummary()).toBe("");
  });

  it("goes back to Custom, which then is disabled and says why", () => {
    const { calls } = mountScreen(details(["a"], { mood: "calm" }));
    openSheet();
    expect(resetButton().getAttribute("aria-disabled")).toBe("false");

    resetButton().click();
    flushSync();
    resetButton().click();

    expect(calls.moodResets).toBe(1);
    expect(resetButton().getAttribute("aria-disabled")).toBe("true");
    expect(resetButton().title).toBe("Die Diashow steht schon auf Eigene");
    expect(moodValue()).toBe("Eigene");
    expect(moodRowSummary()).toBe("Vorgabe");
  });

  it("closes with Done, focus back on the row", () => {
    mountScreen();
    openSheet();

    buttonNamed("Fertig").click();
    flushSync();

    expect(moodRow()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(moodRow());
  });

  it("closes with Esc, focus back on the row", async () => {
    mountScreen();
    openSheet();

    await userEvent.keyboard("{Escape}");
    flushSync();
    await tick();

    expect(moodRow()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(moodRow());
  });

  it("closes on a tap on the scrim, focus back on the row", () => {
    mountScreen();
    openSheet();

    sheet()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    flushSync();

    expect(moodRow()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(moodRow());
  });
});
