import "../../styles/tokens.css";
import "../../styles/base.css";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { createMemoryStorage } from "../testing/memory-storage";
import { createStorageFineSettingsFoldStore } from "./slideshow/fine-settings-fold";
import { details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

type Theme = "light" | "dark";
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };

afterEach(() => {
  unmountScreen();
  document.documentElement.removeAttribute("data-theme");
});

function mountPhone(fold: "open" | "closed", theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  const storage = createMemoryStorage({ "glissando.fineSettingsFold": fold });
  mountScreen(details(["a", "b", "c", "d", "e", "f", "g", "h"], { mood: "calm" }), {
    fineSettingsFold: createStorageFineSettingsFoldStore(storage),
  });
}

function box(selector: string): DOMRect {
  const found = document.querySelector(selector);
  if (found === null) {
    throw new Error(`nothing matches ${selector}`);
  }
  return found.getBoundingClientRect();
}

const tileButtons = () =>
  [...document.querySelectorAll<HTMLElement>("img[alt^='Bild ']")].map((picture) => {
    const button = picture.closest("button");
    if (button === null) {
      throw new Error("a strip picture without its button");
    }
    return button;
  });

describe("SlideshowScreen, the stacked layout at phone width", () => {
  it.each([
    ["light", "closed"],
    ["light", "open"],
    ["dark", "closed"],
    ["dark", "open"],
  ] as const)(
    "keeps Play and a full row of strip tiles in view (%s, fold %s)",
    async (theme, fold) => {
      await page.viewport(PHONE.width, PHONE.height);
      mountPhone(fold, theme);
      const play = box(".preview");
      const firstTop = tileButtons()[0]?.getBoundingClientRect().top;
      const firstRow = tileButtons().filter((b) => b.getBoundingClientRect().top === firstTop);

      expect(play.top).toBeGreaterThanOrEqual(0);
      expect(play.bottom).toBeLessThanOrEqual(PHONE.height);
      expect(firstRow.length).toBeGreaterThan(1);
      for (const tileButton of firstRow) {
        expect(tileButton.getBoundingClientRect().bottom).toBeLessThanOrEqual(PHONE.height);
      }
    },
  );

  it("orders the preview, then the settings card, then the strip", async () => {
    await page.viewport(PHONE.width, PHONE.height);
    mountPhone("closed", "light");

    const preview = box(".preview");
    const card = box(".panel");
    const strip = tileButtons()[0]?.getBoundingClientRect();
    expect(preview.bottom).toBeLessThanOrEqual(card.top);
    expect(card.bottom).toBeLessThanOrEqual(strip?.top ?? 0);
  });

  it("shows no eyebrow or date line on the compact card", async () => {
    await page.viewport(PHONE.width, PHONE.height);
    mountPhone("closed", "light");

    expect(document.querySelector(".panel .eyebrow")?.getBoundingClientRect().height ?? 0).toBe(0);
    expect(document.querySelector(".panel .range")?.getBoundingClientRect().height ?? 0).toBe(0);
  });

  it("gives the three chips equal heights", async () => {
    await page.viewport(PHONE.width, PHONE.height);
    mountPhone("closed", "light");

    const heights = [".tile.music", ".tile.mood", ".tile.look"].map((s) => box(s).height);
    expect(new Set(heights).size).toBe(1);
  });
});

describe("SlideshowScreen, the side panel on a desktop", () => {
  it("gives the Music, Mood and Look tiles equal heights", async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height);
    mountScreen(details(["a", "b", "c"], { mood: "lively", songCount: 1, musicTitle: "Song" }));

    const heights = [".tile.music", ".tile.mood", ".tile.look"].map((s) => box(s).height);
    expect(new Set(heights).size).toBe(1);
  });
});
