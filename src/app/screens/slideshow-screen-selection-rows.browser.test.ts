import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { expectActionsWrapInsideBar } from "./slideshow-screen-dom";
import { ACTION_LINES_BALANCED } from "./slideshow/action-lines";
import { details, mountScreen, tile, unmountScreen } from "./slideshow-screen-harness";

/** The narrowest phone the bar is held to, in CSS pixels. */
const NARROW = { width: 360, height: 740 };
/** A tablet held upright: wide enough for all eight actions on one line, still the phone bar. */
const WIDE_PHONE = { width: 900, height: 1200 };
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

  it("shows every action as a button on two even lines under the count and Done", () => {
    const done = byName("Fertig");
    const actions = [
      "Früher",
      "Später",
      "Ab hier",
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
    const lineOf = (action: HTMLButtonElement) => Math.round(action.getBoundingClientRect().top);
    const lines = actions.map(lineOf);
    const [firstLine, secondLine] = [Math.min(...lines), Math.max(...lines)];
    expect(secondLine).toBeGreaterThan(firstLine);
    expect(lines).toEqual([...Array(4).fill(firstLine), ...Array(4).fill(secondLine)]);
  });

  it("has no More toggle and shows the short labels, none cut off", () => {
    expect(visibleButtons().some((b) => b.getAttribute("aria-haspopup") !== null)).toBe(false);
    expect(bar().querySelector('[aria-label="Weitere Aktionen"]')).toBeNull();

    const labels = visibleButtons()
      .map((b) => b.querySelector<HTMLElement>(".label"))
      .filter((label) => label !== null);
    expect(labels.map((l) => l.innerText.trim())).toEqual([
      "Früher",
      "Später",
      "Ab hier",
      "Ansehen",
      "Bearbeiten",
      "Kapitel",
      "Verschieben",
      "Entfernen",
    ]);
    for (const label of labels) {
      expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
      expect(label.getBoundingClientRect().width).toBeGreaterThan(0);
    }
  });

  it("does not widen the page, and the actions stay inside the bar", () => {
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(pageWidthBefore);
    const barBox = bar().getBoundingClientRect();
    expect(barBox.right).toBeLessThanOrEqual(NARROW.width);
    // Eight actions are wider than the phone: they take two lines inside the bar.
    expectActionsWrapInsideBar(bar());
  });
});

describe("selection bar at 360 px, German, several pictures selected", () => {
  it("keeps its few actions on one line", () => {
    mountScreen(details(["a", "b", "c", "d"]));
    byNameOnScreen("Auswählen").click();
    flushSync();
    tile(1, "01.07.2025").click();
    tile(2, "02.07.2025").click();
    flushSync();

    const actions = [...bar().querySelectorAll<HTMLElement>(".actions button")];
    expect(actions.map((action) => action.innerText.trim())).toContain("Entfernen");
    const lines = new Set(actions.map((action) => Math.round(action.getBoundingClientRect().top)));
    expect(lines.size).toBe(1);
    expect(bar().querySelector(".actions")?.hasAttribute("data-lines")).toBe(false);
  });
});

describe("selection bar at 360 px, laying out its lines", () => {
  it("rebalances on a wider screen without a resize loop the app would report", async () => {
    const errors: string[] = [];
    const record = (event: ErrorEvent) => errors.push(event.message);
    window.addEventListener("error", record);
    try {
      mountScreen(details(["a", "b", "c", "d"]));
      tile(2, "02.07.2025").click();
      flushSync();
      await renderingSteps();
      const actions = bar().querySelector<HTMLElement>(".actions");
      expect(actions?.getAttribute("data-lines")).toBe("2");
      expect(errors).toEqual([]);

      const balanced = new Promise((resolve) =>
        actions?.addEventListener(ACTION_LINES_BALANCED, resolve, { once: true }),
      );
      await page.viewport(WIDE_PHONE.width, WIDE_PHONE.height);
      await balanced;
      expect(actions?.hasAttribute("data-lines")).toBe(false);
      await renderingSteps();
      expect(errors).toEqual([]);
    } finally {
      window.removeEventListener("error", record);
    }
  });
});

/**
 * Resolves once a whole rendering step has run, resize observations included: a frame callback
 * runs before its step's observations, so the second one comes after the first step's.
 */
async function renderingSteps(): Promise<void> {
  for (let frame = 0; frame < 2; frame += 1) {
    await new Promise(requestAnimationFrame);
  }
}

function byNameOnScreen(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.innerText.trim() === name,
  );
  if (found === undefined) throw new Error(`no "${name}" button`);
  return found;
}
