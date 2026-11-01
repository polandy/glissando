import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { details, mountScreen, tile, unmountScreen } from "./slideshow-screen-harness";

/** The narrowest phone the bar is held to, in CSS pixels. */
const NARROW = { width: 360, height: 740 };
const DESKTOP = { width: 1280, height: 900 };

beforeEach(async () => {
  await page.viewport(NARROW.width, NARROW.height);
});

afterEach(async () => {
  unmountScreen();
  await page.viewport(DESKTOP.width, DESKTOP.height);
});

function bar(): HTMLElement {
  const found = document.querySelector<HTMLElement>('[role="toolbar"][aria-label="Auswahl"]');
  if (found === null) {
    throw new Error("the selection bar is not shown");
  }
  return found;
}

const visibleButtons = (): HTMLButtonElement[] =>
  [...bar().querySelectorAll<HTMLButtonElement>("button")].filter(
    (button) => button.getClientRects().length > 0,
  );

const byName = (name: string): HTMLButtonElement => {
  const found = visibleButtons().find((button) =>
    [button.getAttribute("aria-label"), button.innerText.trim()].includes(name),
  );
  if (found === undefined) {
    throw new Error(`no visible "${name}" button`);
  }
  return found;
};

describe("selection bar at 360 px, German, one picture selected", () => {
  let pageWidthBefore = 0;

  beforeEach(() => {
    mountScreen(details(["a", "b", "c", "d"]));
    pageWidthBefore = document.documentElement.scrollWidth;
    tile(2, "02.07.2025").click();
    flushSync();
  });

  it("shows every action as a button in a second row under the count and Done", () => {
    const done = byName("Fertig");
    const actions = [
      "Früher",
      "Später",
      "Ansehen",
      "Bearbeiten",
      "Kapitel",
      "Verschieben nach …",
      "Entfernen",
    ].map(byName);

    expect(bar().textContent).toContain("Bild 2 von 4");
    for (const action of actions) {
      expect(action.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        done.getBoundingClientRect().bottom,
      );
    }
    expect(new Set(actions.map((a) => Math.round(a.getBoundingClientRect().top))).size).toBe(1);
  });

  it("has no More toggle and shows the short labels, none cut off", () => {
    expect(visibleButtons().some((b) => b.getAttribute("aria-haspopup") !== null)).toBe(false);
    expect(bar().querySelector('[aria-label="Weitere Aktionen"]')).toBeNull();

    const labels = visibleButtons().map((b) => b.querySelector(".label") as HTMLElement | null);
    const texts = labels.map((l) => l?.innerText.trim());
    expect(texts).toContain("Kapitel");
    expect(texts).toContain("Verschieben");
    for (const label of labels) {
      if (label !== null) {
        expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
        expect(label.getBoundingClientRect().width).toBeGreaterThan(0);
      }
    }
  });

  it("does not widen the page, and the actions stay inside the bar", () => {
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(pageWidthBefore);
    const barBox = bar().getBoundingClientRect();
    expect(barBox.right).toBeLessThanOrEqual(NARROW.width);
    for (const button of visibleButtons()) {
      expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(barBox.right);
    }
  });
});
