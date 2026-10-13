import { expect, test, type Page } from "@playwright/test";
import { createSlideshow, GERMAN_BROWSER } from "./support/app";
import { BELOW_PATH, BELOW_PATH_URL } from "./support/below-path";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

const OFFLINE_STATUS = "Offline · gespeichert auf diesem Gerät";

function statusBar(page: Page) {
  return page.getByRole("contentinfo");
}

test.describe("with the service worker", () => {
  test.use({ serviceWorkers: "allow" });

  test.beforeEach(({ browserName }) => {
    test.skip(
      browserName === "webkit",
      "Playwright's WebKit fails an offline navigation before its service worker can answer it",
    );
    test.skip(
      browserName === "firefox",
      "Playwright's Firefox answers offline from its HTTP cache, so the case passes without the service worker's cache",
    );
  });

  test("E2E-018 after one load the app starts offline with its library", async ({
    page,
    context,
  }) => {
    await openApp(page);
    await installServiceWorker(page);
    await createSlideshow(page, ["2025-07-12", "2025-07-14"], 2);
    await page.getByRole("button", { name: "Zurück" }).click();
    await expect(page.getByRole("heading", { name: "Deine Diashows" })).toBeVisible();

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole("heading", { name: "Deine Diashows" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Juli 2025/ })).toBeVisible();
    await expect(statusBar(page)).toContainText(OFFLINE_STATUS);
  });

  test("E2E-053 below a path, as on GitHub Pages, the app installs there and starts offline", async ({
    page,
    context,
  }) => {
    await openApp(page, BELOW_PATH_URL);
    const scope = await installServiceWorker(page);
    expect(new URL(scope).pathname).toBe(BELOW_PATH);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole("heading", { name: "Bilder rein, Diashow raus." })).toBeVisible();
    await expect(statusBar(page)).toContainText(OFFLINE_STATUS);
  });
});

/**
 * Waits for the first load's service worker, which controls the page from the next load on, and
 * reloads into it; returns the worker's scope.
 */
async function installServiceWorker(page: Page): Promise<string> {
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  await page.reload();
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  return scope;
}

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
