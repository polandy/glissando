import { expect, test, type Page } from "@playwright/test";
import { GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

function settingsDialog(page: Page, name = "Einstellungen") {
  return page.getByRole("dialog", { name });
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Einstellungen" }).click();
  await expect(settingsDialog(page)).toBeVisible();
});

test("E2E-011 a pinned dark theme applies at once and survives a reload", async ({ page }) => {
  await settingsDialog(page).getByRole("radio", { name: "Dunkel", exact: true }).check();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(page.getByRole("button", { name: "Einstellungen" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("E2E-012 choosing English switches the copy at once", async ({ page }) => {
  await settingsDialog(page).getByRole("radio", { name: "English", exact: true }).check();

  await expect(settingsDialog(page, "Settings")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pictures in, slideshow out." })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("E2E-013 the browser back gesture closes the settings", async ({ page }) => {
  await page.goBack();

  await expect(page.getByRole("button", { name: "Einstellungen" })).toBeVisible();
  await expect(settingsDialog(page)).toBeHidden();
});
