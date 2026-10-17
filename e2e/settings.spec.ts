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

test("E2E-044 the settings name the running build: version, commit and its date", async ({
  page,
}) => {
  const version = settingsDialog(page).getByRole("region", { name: "Version" });

  await expect(version.getByText(/^Glissando \d+\.\d+\.\d+$/)).toBeVisible();
  await expect(version.getByText(/^[0-9a-f]{7} · \d{2}\.\d{2}\.\d{4}$/)).toBeVisible();
});

test("E2E-070 the settings link to the documentation and the source code on GitHub", async ({
  page,
}) => {
  const dialog = settingsDialog(page);
  const documentation = dialog.getByRole("link", { name: "Dokumentation" });
  const sourceCode = dialog.getByRole("link", { name: "Quellcode auf GitHub" });

  await expect(documentation).toHaveAttribute(
    "href",
    "https://github.com/polandy/glissando#readme",
  );
  await expect(documentation).toHaveAttribute("target", "_blank");
  await expect(sourceCode).toHaveAttribute("href", "https://github.com/polandy/glissando");
  await expect(sourceCode).toHaveAttribute("target", "_blank");
});
