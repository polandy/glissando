import { expect, test, type Page } from "@playwright/test";
import { createSlideshow, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

const OFFLINE_STATUS = "Offline · gespeichert auf diesem Gerät";

function statusBar(page: Page) {
  return page.getByRole("contentinfo");
}

test.describe("with the service worker", () => {
  test.use({ serviceWorkers: "allow" });

  test("E2E-018 after one load the app starts offline with its library", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName === "webkit",
      "Playwright's WebKit fails an offline navigation before its service worker can answer it",
    );
    test.skip(
      browserName === "firefox",
      "Playwright's Firefox answers offline from its HTTP cache, so the case passes without the service worker's cache",
    );
    await openApp(page);
    // The first load installs the service worker; it controls the page from the next one on.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
    await createSlideshow(page, ["2025-07-12", "2025-07-14"], 2);
    await page.getByRole("button", { name: "Zurück" }).click();
    await expect(page.getByRole("heading", { name: "Deine Diashows" })).toBeVisible();

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole("heading", { name: "Deine Diashows" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Juli 2025/ })).toBeVisible();
    await expect(statusBar(page)).toContainText(OFFLINE_STATUS);
  });
});

test("E2E-019 the start screen footer offers the install guide where the browser has no install prompt", async ({
  page,
  browserName,
}) => {
  await openApp(page);
  await expect(statusBar(page)).toContainText(OFFLINE_STATUS);
  const installAsApp = statusBar(page).getByRole("button", { name: "Als App installieren" });

  if (browserName === "chromium") {
    // Chromium offers its own install prompt, and headless Chromium never does: no hint.
    await expect(statusBar(page).getByRole("button")).toHaveCount(0);
    return;
  }

  await installAsApp.click();
  if (browserName === "firefox") {
    const guide = page.getByRole("dialog", { name: "Firefox installiert keine Apps" });
    await expect(guide).toContainText("Glissando läuft hier trotzdem offline");
    await expect(guide).toContainText("öffne Glissando in Chrome, Edge oder Safari");
  } else {
    const guide = page.getByRole("dialog", { name: "Glissando als App" });
    await expect(guide.getByRole("listitem")).toHaveText([
      "Öffne das Menü Ablage",
      "Wähle Zum Dock hinzufügen …",
      "Klicke auf Hinzufügen",
    ]);
  }
});
