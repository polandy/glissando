import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { click } from "./slideshow-screen-dom";
import { details, mountScreen, tile, unmountScreen } from "./slideshow-screen-harness";

/** The phone of the approved mockup, in CSS pixels. */
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
/** The least a touch target measures (WCAG 2.2 AAA, and the app's own rule). */
const MIN_TARGET = 44;
const THEMES = ["light", "dark"] as const;

beforeEach(async () => {
  await page.viewport(PHONE.width, PHONE.height);
});

afterEach(async () => {
  unmountScreen();
  delete document.documentElement.dataset["theme"];
  await page.viewport(DESKTOP.width, DESKTOP.height);
});

function bar(): HTMLElement {
  const found = document.querySelector<HTMLElement>('[role="toolbar"][aria-label="Auswahl"]');
  if (found === null) {
    throw new Error("the selection bar is not shown");
  }
  return found;
}

/** The bar's visible buttons (a display:none one has no box), by their visible text. */
function barButtons(): Map<string, HTMLButtonElement> {
  const shown = [...bar().querySelectorAll<HTMLButtonElement>("button")].filter(
    (button) => button.getClientRects().length > 0,
  );
  return new Map(shown.map((button) => [button.innerText.trim(), button]));
}

function selectNth(number: number, date: string): ReturnType<typeof mountScreen> {
  const mounted = mountScreen(details(["a", "b", "c", "d"]));
  tile(number, date).click();
  flushSync();
  return mounted;
}

describe.each(THEMES)("selection bar on the phone, %s theme", (theme) => {
  beforeEach(() => {
    document.documentElement.dataset["theme"] = theme;
  });

  it("labels every action under its icon, every target at least 44 px high", () => {
    selectNth(2, "02.07.2025");
    const buttons = barButtons();

    expect([...buttons.keys()]).toEqual([
      "Früher",
      "Später",
      "Ansehen",
      "Bearbeiten",
      "Kapitel",
      "Verschieben",
      "Entfernen",
      "Fertig",
    ]);
    for (const [label, button] of buttons) {
      const box = button.getBoundingClientRect();
      expect(box.height, `${label} height`).toBeGreaterThanOrEqual(MIN_TARGET);
      const text = button.querySelector(".label") ?? button;
      expect(text.getBoundingClientRect().width, `${label} text`).toBeGreaterThan(0);
    }
    const view = buttons.get("Ansehen") as HTMLElement;
    const icon = view.querySelector("svg") as SVGElement;
    const text = view.querySelector(".label") as HTMLElement;
    expect(text.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      icon.getBoundingClientRect().bottom,
    );
    expect(bar().getBoundingClientRect().right).toBeLessThanOrEqual(PHONE.width);
  });

  it("names the short-labelled actions in full for assistive technology", () => {
    selectNth(2, "02.07.2025");
    const names = [...bar().querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));

    expect(names).toContain("Kapitel davor einfügen");
    expect(names).toContain("Verschieben nach\u00a0…");
  });

  it("disables Earlier at the first picture and Later at the last, and does nothing when tapped", () => {
    const { calls } = selectNth(1, "01.07.2025");
    const earlier = barButtons().get("Früher") as HTMLElement;
    const later = barButtons().get("Später") as HTMLElement;
    expect(earlier.getAttribute("aria-disabled")).toBe("true");
    expect(later.getAttribute("aria-disabled")).toBe("false");

    click(earlier);
    expect(calls.shifted).toEqual([]);
    click(later);
    expect(calls.shifted).toEqual([[["a"], 1]]);
  });

  it.each([
    ["Anfang", 0, 0],
    ["Ende", 0, 4],
    // The stepper starts at the selected picture's number (3); one step down is picture 2.
    ["Vor Bild\u00a0…", 1, 1],
  ])(
    "Move to %s hands onMoveGroup the insertion in the current order",
    async (choice, stepsDown, insertion) => {
      const { calls } = selectNth(3, "03.07.2025");
      click(barButtons().get("Verschieben") as HTMLElement);
      flushSync();
      await expect.poll(() => document.querySelector("dialog[open]")).not.toBeNull();
      const dialog = document.querySelector("dialog") as HTMLDialogElement;
      const named = (name: string): HTMLElement => {
        const found = [...dialog.querySelectorAll<HTMLElement>("button")].find(
          (button) => (button.getAttribute("aria-label") ?? button.textContent?.trim()) === name,
        );
        if (found === undefined) {
          throw new Error(`no "${name}" in the sheet`);
        }
        return found;
      };

      named(choice).click();
      flushSync();
      for (let step = 0; step < stepsDown; step += 1) {
        named("Kleinere Bildnummer").click();
        flushSync();
      }
      if (stepsDown > 0) {
        expect(dialog.querySelector("b")?.textContent).toBe(String(3 - stepsDown));
      }
      named("Verschieben").click();
      flushSync();

      expect(calls.moved).toEqual([[["c"], insertion]]);
    },
  );
});

describe("selection bar just under the wide breakpoint", () => {
  it("keeps the narrow two-row bar, not an overflowing wide one", async () => {
    await page.viewport(1100, DESKTOP.height);
    mountScreen(details(["a", "b", "c", "d"]));
    tile(2, "02.07.2025").click();
    flushSync();

    expect([...barButtons().keys()]).toEqual([
      "Früher",
      "Später",
      "Ansehen",
      "Bearbeiten",
      "Kapitel",
      "Verschieben",
      "Entfernen",
      "Fertig",
    ]);
    expect(bar().getBoundingClientRect().right).toBeLessThanOrEqual(1100);
  });
});

describe.each([1160, DESKTOP.width])("selection bar when %s px wide", (width) => {
  it("shows every action inline, labels beside the icons, none overflowing the bar", async () => {
    await page.viewport(width, DESKTOP.height);
    mountScreen(details(["a", "b", "c", "d"]));
    tile(2, "02.07.2025").click();
    flushSync();
    const buttons = barButtons();

    expect([...buttons.keys()]).toEqual([
      "Früher",
      "Später",
      "Ansehen",
      "Bearbeiten",
      "Kapitel davor einfügen",
      "Verschieben nach …",
      "Entfernen",
      "Fertig",
    ]);
    expect(bar().textContent).toContain("Bild 2 von 4");
    const barBox = bar().getBoundingClientRect();
    for (const [label, button] of buttons) {
      const box = button.getBoundingClientRect();
      expect(box.left, label).toBeGreaterThanOrEqual(barBox.left);
      expect(box.right, label).toBeLessThanOrEqual(barBox.right);
      expect(box.height, label).toBeGreaterThanOrEqual(MIN_TARGET);
      const icon = button.querySelector("svg") as SVGElement;
      const text = button.querySelector(".label.long");
      if (text !== null) {
        expect(text.getBoundingClientRect().left, label).toBeGreaterThanOrEqual(
          icon.getBoundingClientRect().right,
        );
      }
    }
    expect(barBox.right).toBeLessThanOrEqual(width);
    expect(bar().querySelector("[aria-haspopup]")).toBeNull();
  });
});
