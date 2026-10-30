import { expect, test } from "@playwright/test";
import {
  CREATED_TOAST,
  captionField,
  createSlideshow,
  editPicture,
  GERMAN_BROWSER,
} from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

/** Half the toast's six seconds: room for the pause call, none for the toast to expire. */
const PAUSE_AHEAD_MS = 3000;

test("E2E-086 the created toast ends once the slideshow screen is left", async ({ page }) => {
  await page.clock.install();
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14"]);
  // Time stands still from here, so the toast's own six seconds cannot end it; only leaving can.
  // The pause lies ahead of the page's clock, which runs on until the call lands.
  const shownAt = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(shownAt + PAUSE_AHEAD_MS);
  const toast = page.getByText(CREATED_TOAST);
  await expect(toast).toBeVisible();

  await editPicture(page, "Bild 1, aufgenommen am 12.07.2025");

  await expect(captionField(page)).toBeVisible();
  await expect(toast).toBeHidden();
});
