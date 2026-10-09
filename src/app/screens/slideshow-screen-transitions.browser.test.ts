import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { TILE_LOOP_MS, TILE_STILL_MS } from "../picture-editor/timing/preview-timeline";
import {
  buttonNamed,
  details,
  mountScreen,
  press,
  unmountScreen,
} from "./slideshow-screen-harness";
import type { SlideshowDetails } from "./view-models";

afterEach(() => unmountScreen());

/** The text as read, whitespace between elements collapsed. */
const text = (within: Element | null) => within?.textContent?.replace(/\s+/g, " ").trim() ?? "";
const transitionsRow = () => {
  const row = document.querySelector<HTMLButtonElement>(".rows button.transitions");
  if (row === null) {
    throw new Error("no transitions row");
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
const resetButton = () => buttonNamed("Zurück auf Überblenden");

/** Pictures a to d, the ones named with an own transition into the next. */
function withOwn(ownIds: readonly string[], overrides: Partial<SlideshowDetails> = {}) {
  const base = details(["a", "b", "c", "d"], overrides);
  return {
    ...base,
    ownTransitionCount: ownIds.length,
    pictures: base.pictures.map((picture) =>
      ownIds.includes(picture.id) ? { ...picture, ownTransition: "cut" as const } : picture,
    ),
  };
}

function openSheet(): void {
  transitionsRow().click();
  flushSync();
}

describe("SlideshowScreen, the transitions row", () => {
  it("names the default crossfade and offers to change it", () => {
    mountScreen();

    expect(text(transitionsRow())).toBe("Übergänge Überblenden Vorgabe Ändern");
  });

  it("names an own choice and counts the pictures with their own transition", () => {
    mountScreen(withOwn(["a"], { transition: "alternate" }));

    expect(text(transitionsRow())).toBe("Übergänge Abwechselnd eigene Wahl · 1 eigener Ändern");
  });

  it("counts several own transitions in the plural", () => {
    mountScreen(withOwn(["a", "c"]));

    expect(transitionsRow().querySelector("small")?.textContent).toBe("Vorgabe · 2 eigene");
  });
});

describe("SlideshowScreen, the transitions sheet", () => {
  it("opens with the eight choices, the default crossfade checked and tagged, focus on it", () => {
    mountScreen();

    openSheet();

    expect(sheet()?.open).toBe(true);
    expect(text(sheet()?.querySelector("#transitions-title") ?? null)).toBe(
      "Übergänge der Diashow",
    );
    expect(pill()).toBe("Vorgabe");
    const radios = [...(sheet()?.querySelectorAll('[role="radio"]') ?? [])];
    expect(
      radios.map((radio) =>
        text(radio)
          .replace(/^Vorgabe/, "")
          .trim(),
      ),
    ).toEqual([
      "Überblenden",
      "Schieben",
      "Wischen",
      "Kreis",
      "Zoom",
      "Auflösen",
      "Schnitt",
      "Abwechselnd",
    ]);
    expect(tile("crossfade").getAttribute("aria-checked")).toBe("true");
    expect(tile("crossfade").classList.contains("automatic")).toBe(true);
    expect(tile("crossfade").querySelector(".tag")?.textContent).toBe("Vorgabe");
    expect(sheet()?.querySelectorAll(".tag")).toHaveLength(1);
    expect(document.activeElement).toBe(tile("crossfade"));
    expect(text(sheet())).toContain(
      "Jeder Übergang: Überblenden. Er dauert 30 % der Bildzeit, höchstens 1 s.",
    );
  });

  it("opens with focus on the checked choice", () => {
    mountScreen(details(["a", "b"], { transition: "zoom-in" }));

    openSheet();

    expect(tile("zoom-in").getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(tile("zoom-in"));
  });

  it("stores a picked effect at once and shows it as the own choice", () => {
    const { calls } = mountScreen();
    openSheet();

    tile("dissolve").click();
    flushSync();

    expect(calls.transitions).toEqual(["dissolve"]);
    expect(pill()).toBe("Eigene Wahl");
    expect(tile("dissolve").getAttribute("aria-checked")).toBe("true");
    expect(tile("dissolve").classList.contains("automatic")).toBe(false);
    expect(text(sheet())).toContain("Jeder Übergang: Auflösen.");
    expect(text(transitionsRow())).toContain("Auflösen eigene Wahl");
  });

  it("explains alternating and the cut", () => {
    mountScreen(details(["a", "b"], { transition: "alternate" }));
    openSheet();

    expect(text(sheet())).toContain(
      "Die Effekte wechseln von Bild zu Bild ab, nie zweimal derselbe hintereinander.",
    );
    tile("cut").click();
    flushSync();
    expect(text(sheet())).toContain("Die Bilder folgen ohne Übergang aufeinander.");
  });

  it("moves the choice with the arrow keys, selection following focus", () => {
    const { calls } = mountScreen();
    openSheet();

    press(tile("crossfade"), "ArrowLeft");

    expect(calls.transitions).toEqual(["alternate"]);
    expect(document.activeElement).toBe(tile("alternate"));
  });

  it("plays the alternating tile's effects in turn, the next one each loop", () => {
    const { clock, frames } = mountScreen();
    openSheet();
    const looks = (choice: string) =>
      [...tile(choice).querySelectorAll<HTMLElement>(".layer")].map((layer) => layer.style.cssText);
    const advance = (ms: number) => {
      clock.advance(ms);
      frames.runFrame();
      flushSync();
    };

    advance(TILE_STILL_MS);
    expect(looks("alternate")).toEqual(looks("crossfade"));
    advance(TILE_LOOP_MS);
    expect(looks("alternate")).toEqual(looks("push-left"));
    expect(looks("alternate")).not.toEqual(looks("crossfade"));
  });

  it("names the pictures that keep their own transition", () => {
    mountScreen(withOwn(["a", "c"]));
    openSheet();

    expect(text(sheet())).toContain(
      "Bild 1 und 3 behalten ihren eigenen Übergang – zu ändern im Bildeditor.",
    );
  });

  it("names a single picture that keeps its own transition", () => {
    mountScreen(withOwn(["b"]));
    openSheet();

    expect(text(sheet())).toContain(
      "Bild 2 behält seinen eigenen Übergang – zu ändern im Bildeditor.",
    );
  });

  it("goes back to crossfade, which then looks off and says why", () => {
    const { calls } = mountScreen(details(["a", "b"], { transition: "zoom-in" }));
    openSheet();
    expect(resetButton().getAttribute("aria-disabled")).toBe("false");

    resetButton().click();
    flushSync();
    resetButton().click();

    expect(calls.transitionResets).toBe(1);
    expect(pill()).toBe("Vorgabe");
    expect(resetButton().getAttribute("aria-disabled")).toBe("true");
    expect(resetButton().title).toBe("Die Übergänge stehen schon auf Überblenden");
  });

  it("closes with Done, focus back on the row", () => {
    mountScreen();
    openSheet();

    buttonNamed("Fertig").click();
    flushSync();

    expect(transitionsRow()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(transitionsRow());
  });

  it("closes with Esc, focus back on the row", async () => {
    mountScreen();
    openSheet();

    await userEvent.keyboard("{Escape}");
    flushSync();
    await tick();

    expect(transitionsRow()).not.toBeNull();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(transitionsRow());
  });

  it("closes on a tap on the scrim", () => {
    mountScreen();
    openSheet();

    tile("crossfade").click();
    sheet()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    flushSync();

    expect(transitionsRow()).not.toBeNull();
    expect(sheet()).toBeNull();
  });

  it("under reduced motion, the tiles stand still", () => {
    const { frames } = mountScreen(details(["a", "b"]), { reducedMotion: true });

    openSheet();

    expect(tile("crossfade")).not.toBeNull();
    expect(frames.hasPendingFrame).toBe(false);
  });
});
