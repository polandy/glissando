import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { buttonNamed, details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

/** The text as read, whitespace between elements collapsed. */
const text = (within: Element | null) => within?.textContent?.replace(/\s+/g, " ").trim() ?? "";
const moodTile = () => {
  const found = document.querySelector<HTMLButtonElement>(".tiles button.mood");
  if (found === null) {
    throw new Error("no mood tile");
  }
  return found;
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
const moodValue = () => text(moodTile().querySelector(".value b") ?? null);
const moodSummary = () => text(moodTile().querySelector(".value small") ?? null);
const resetButton = () => buttonNamed("Stimmung ausschalten");

function openSheet(): void {
  moodTile().click();
  flushSync();
}

describe("SlideshowScreen, the mood tile", () => {
  it("names Custom with one short phrase", () => {
    mountScreen();

    expect(moodValue()).toBe("Keine Stimmung");
    expect(moodSummary()).toBe("Ihre Einstellungen");
  });

  it("names the stored mood with its short phrase", () => {
    mountScreen(details(["a"], { mood: "calm" }));

    expect(moodValue()).toBe("Ruhig");
    expect(moodSummary()).toBe("Langsam, sanft");
  });

  it("keeps the derived numbers off the tile, even with the energy pacing and music", () => {
    mountScreen(
      details(["a"], {
        mood: "lively",
        energyPacing: true,
        songCount: 1,
        musicTitle: "m.mp3",
        musicSeconds: 90,
        ownDurationCount: 1,
      }),
      { moodBpm: 80 },
    );

    expect(moodSummary()).toBe("Schnell, auf dem Beat");
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
    expect(moodSummary()).toBe("Schnell, auf dem Beat");
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
    expect(resetButton().title).toBe("Keine Stimmung ist an");
    expect(moodValue()).toBe("Keine Stimmung");
    expect(moodSummary()).toBe("Ihre Einstellungen");
  });

  it("closes with Done, focus back on the tile", () => {
    mountScreen();
    openSheet();

    buttonNamed("Fertig").click();
    flushSync();

    expect(moodTile()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(moodTile());
  });

  it("closes with Esc, focus back on the tile", async () => {
    mountScreen();
    openSheet();

    await userEvent.keyboard("{Escape}");
    flushSync();
    await tick();

    expect(moodTile()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(moodTile());
  });

  it("closes on a tap on the scrim, focus back on the tile", () => {
    mountScreen();
    openSheet();

    sheet()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    flushSync();

    expect(moodTile()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(moodTile());
  });
});
