import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
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
  return new Map(shown.map((button) => [button.textContent?.trim() ?? "", button]));
}

function selectNth(number: number, date: string): ReturnType<typeof mountScreen> {
  const mounted = mountScreen(details(["a", "b", "c", "d"]));
  tile(number, date).click();
  flushSync();
  return mounted;
}

async function openMore(): Promise<HTMLElement> {
  const more = barButtons().get("Mehr");
  if (more === undefined) {
    throw new Error("no More button");
  }
  more.click();
  flushSync();
  await expect.poll(() => document.querySelector('[role="menu"]')).not.toBeNull();
  return document.querySelector<HTMLElement>('[role="menu"]') as HTMLElement;
}

const menuItem = (menu: HTMLElement, name: string): HTMLElement => {
  const found = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (item) => item.textContent?.trim() === name,
  );
  if (found === undefined) {
    throw new Error(`no menu item "${name}"`);
  }
  return found;
};

describe.each(THEMES)("selection bar on the phone, %s theme", (theme) => {
  beforeEach(() => {
    document.documentElement.dataset["theme"] = theme;
  });

  it("labels View, Edit, Remove and More under their icons, every target at least 44 px", () => {
    selectNth(2, "02.07.2025");
    const buttons = barButtons();

    expect([...buttons.keys()]).toEqual(["Ansehen", "Bearbeiten", "Entfernen", "Mehr", "Fertig"]);
    for (const [label, button] of buttons) {
      const box = button.getBoundingClientRect();
      expect(box.width, `${label} width`).toBeGreaterThanOrEqual(MIN_TARGET);
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
    expect(buttons.get("Mehr")?.getAttribute("aria-label")).toBe("Weitere Aktionen");
    expect(bar().getBoundingClientRect().right).toBeLessThanOrEqual(PHONE.width);
  });

  it("opens More with Earlier, Later, Insert chapter and Move to, closing on Escape back to More", async () => {
    selectNth(2, "02.07.2025");
    const menu = await openMore();

    const names = [...menu.querySelectorAll('[role="menuitem"]')].map((item) =>
      item.textContent?.trim(),
    );
    expect(names).toEqual(["Früher", "Später", "Kapitel davor einfügen", "Verschieben nach …"]);
    for (const item of menu.querySelectorAll<HTMLElement>('[role="menuitem"]')) {
      expect(item.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
    }
    expect(document.activeElement).toBe(menuItem(menu, "Früher"));

    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(menuItem(menu, "Später"));

    await userEvent.keyboard("{Escape}");
    await expect.poll(() => document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(barButtons().get("Mehr"));
  });

  it("disables Earlier at the first picture and Later at the last, and does nothing when tapped", async () => {
    const { calls } = selectNth(1, "01.07.2025");
    const menu = await openMore();
    expect(menuItem(menu, "Früher").getAttribute("aria-disabled")).toBe("true");
    expect(menuItem(menu, "Später").getAttribute("aria-disabled")).toBe("false");

    click(menuItem(menu, "Früher"));
    expect(calls.shifted).toEqual([]);
    click(menuItem(menu, "Später"));
    expect(calls.shifted).toEqual([[["a"], 1]]);
    await expect.poll(() => document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(barButtons().get("Mehr"));
  });

  it("closes the menu on a tap outside it", async () => {
    selectNth(2, "02.07.2025");
    await openMore();

    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    flushSync();

    await expect.poll(() => document.querySelector('[role="menu"]')).toBeNull();
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
      click(menuItem(await openMore(), "Verschieben nach\u00a0…"));
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
  it("keeps the narrow bar with More, not an overflowing wide one", async () => {
    await page.viewport(1100, DESKTOP.height);
    mountScreen(details(["a", "b", "c", "d"]));
    tile(2, "02.07.2025").click();
    flushSync();

    expect([...barButtons().keys()]).toEqual([
      "Ansehen",
      "Bearbeiten",
      "Entfernen",
      "Mehr",
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
      const text = button.querySelector(".label");
      if (text !== null) {
        expect(text.getBoundingClientRect().left, label).toBeGreaterThanOrEqual(
          icon.getBoundingClientRect().right,
        );
      }
    }
    expect(barBox.right).toBeLessThanOrEqual(width);
    expect(barButtons().has("Mehr")).toBe(false);
  });
});
