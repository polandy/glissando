import { expect, test } from "@playwright/test";
import { createSlideshow, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

/** The reference phone, a Pixel 9 Pro, in CSS pixels. */
const PHONE = { width: 412, height: 915 };

test.use({ ...GERMAN_BROWSER, viewport: PHONE });

test("E2E-094 on a phone the picture editor shows the frames or the preview, switched with Frame | Play", async ({
  page,
}) => {
  const well = page.locator(".well");
  const preview = page.locator(".preview");
  // Only the shown view's switch is in the accessibility tree.
  const views = page.getByRole("group", { name: "Ansicht" });
  const frameView = views.getByRole("button", { name: "Rahmen" });
  const playView = views.getByRole("button", { name: "Abspielen" });
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"], 2);

  await page
    .getByRole("button", { name: "Bild 2, aufgenommen am 14.07.2025", exact: true })
    .click();
  await page
    .getByRole("toolbar", { name: "Auswahl" })
    .getByRole("button", { name: "Bearbeiten" })
    .click();

  await expect(well).toBeVisible();
  await expect(frameView).toHaveAttribute("aria-pressed", "true");
  await expect(preview).toBeHidden();

  await playView.click();
  await expect(preview).toBeVisible();
  await expect(playView).toHaveAttribute("aria-pressed", "true");
  await expect(well).toBeHidden();

  await frameView.click();
  await expect(well).toBeVisible();
  await expect(preview).toBeHidden();

  await page.getByRole("button", { name: "Start und Ende tauschen" }).click();
  await expect(preview).toBeVisible();
  await expect(well).toBeHidden();
});
