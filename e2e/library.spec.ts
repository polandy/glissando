import { expect, test } from "@playwright/test";
import { createSlideshow, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

test("E2E-008 a created slideshow stays in the library after a reload", async ({ page }) => {
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14"], 2);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Juli 2025" })).toBeVisible();
  await page.getByRole("button", { name: "Zurück" }).click();

  await expect(page.getByRole("heading", { name: "Deine Diashows" })).toBeVisible();
  await page.getByRole("button", { name: /Juli 2025/ }).click();

  await expect(page.getByRole("heading", { name: "Juli 2025" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Bild 1, aufgenommen am 12.07.2025" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Bild 2, aufgenommen am 14.07.2025" })).toBeVisible();
});
