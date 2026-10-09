import { expect, test, type Page } from "@playwright/test";

/** The built app's script; held back, it leaves index.html's app shell on screen. */
const APP_SCRIPT = "**/assets/index-*.js";

/**
 * Holds the app's script until the returned release is called. The page's load waits on it, so
 * a held page is opened with `goto(…, { waitUntil: "commit" })`.
 */
async function holdAppScript(page: Page): Promise<() => void> {
  let release = (): void => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(APP_SCRIPT, async (route) => {
    await released;
    await route.continue();
  });
  return release;
}

test("E2E-026 the app shell shows before the app's script runs and gives way to the app", async ({
  page,
}) => {
  const releaseAppScript = await holdAppScript(page);

  await page.goto("/", { waitUntil: "commit" });

  const shell = page.locator("#app-shell");
  await expect(shell.getByText("Glissando")).toBeVisible();
  await expect(page.locator("#app")).toBeEmpty();

  releaseAppScript();

  await expect(page.getByRole("button", { name: "New slideshow" })).toBeVisible();
  await expect(shell).toHaveCount(0);
});

test("E2E-027 a pinned dark theme is in place while the app shell shows", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glissando.theme", "dark"));
  const releaseAppScript = await holdAppScript(page);

  await page.goto("/", { waitUntil: "commit" });

  await expect(page.locator("#app-shell").getByText("Glissando")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  releaseAppScript();
  await expect(page.locator("#app-shell")).toHaveCount(0);
});
