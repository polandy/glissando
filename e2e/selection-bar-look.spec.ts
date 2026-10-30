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

/** Longer than the bar's hold before a bubble shows (BarAction.svelte), shorter than its linger. */
const PAST_THE_HOLD_MS = 600;

test("E2E-087 on a phone the selection bar shows icons; a held icon names its action without acting, a tap acts", async ({
  page,
}) => {
  await page.clock.install();
  await openApp(page);
  await createSlideshow(page, ["2025-07-01", "2025-07-02", "2025-07-03"], 2);
  const second = page.getByRole("button", {
    name: "Bild 2, aufgenommen am 02.07.2025",
    exact: true,
  });
  const selectionBar = page.getByRole("toolbar", { name: "Auswahl" });
  await second.click();
  const remove = selectionBar.getByRole("button", { name: "Bild entfernen" });
  const bubble = remove.getByText("Bild entfernen");
  await expect(remove).toBeVisible();
  await expect(bubble).toHaveCSS("opacity", "0");

  // Time stands still from here; only runFor moves the hold on.
  const heldAt = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(heldAt + PAST_THE_HOLD_MS);
  const finger = { pointerType: "touch", isPrimary: true, bubbles: true };
  await remove.dispatchEvent("pointerdown", finger);
  await page.clock.runFor(PAST_THE_HOLD_MS);
  await expect(bubble).toHaveCSS("opacity", "1");
  await remove.dispatchEvent("pointerup", finger);
  await remove.dispatchEvent("click");

  await expect(second).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^Bild \d, aufgenommen/ })).toHaveCount(3);

  await remove.click();
  await expect(page.getByRole("button", { name: /^Bild \d, aufgenommen/ })).toHaveCount(2);
  await expect(second).toBeHidden();
});
