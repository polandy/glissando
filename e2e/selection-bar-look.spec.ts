import { expect, test } from "@playwright/test";
import { createSlideshow, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

/** The reference phone, a Pixel 9 Pro, in CSS pixels. */
const PHONE = { width: 412, height: 915 };

test.use({ ...GERMAN_BROWSER, viewport: PHONE });

for (const colorScheme of ["light", "dark"] as const) {
  test(`E2E-066 the selection bar stands out from the ${colorScheme} screen and fits a phone, Done included`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await openApp(page);
    await createSlideshow(page, ["2025-07-01", "2025-07-02", "2025-07-03"], 2);
    const third = page.getByRole("button", {
      name: "Bild 3, aufgenommen am 03.07.2025",
      exact: true,
    });
    const selectionBar = page.getByRole("toolbar", { name: "Auswahl" });

    await third.click();
    await expect(selectionBar).toBeVisible();

    // Inverse to the screen (dev-docs/app/slideshow-editing/REMOVE_SELECT_REORDER.md).
    const barColour = await selectionBar.evaluate((bar) => getComputedStyle(bar).backgroundColor);
    const screenColour = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.color = "var(--gl-surface)";
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    });
    expect(barColour).not.toBe(screenColour);

    // Every button inside the phone's width; Earlier and Later keep their names as arrows.
    const done = selectionBar.getByRole("button", { name: "Fertig" });
    const doneBox = await done.boundingBox();
    expect(doneBox).not.toBeNull();
    expect((doneBox?.x ?? Infinity) + (doneBox?.width ?? 0)).toBeLessThanOrEqual(PHONE.width);
    await expect(selectionBar.getByRole("button", { name: "Früher" })).toBeVisible();
    await expect(selectionBar.getByRole("button", { name: "Später" })).toBeVisible();

    await done.click();
    await expect(third).toHaveAttribute("aria-pressed", "false");
    await expect(selectionBar).toBeHidden();
  });
}
