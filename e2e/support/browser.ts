import type { Page } from "@playwright/test";

/**
 * Opens the app in a browser that behaves the same in every engine where engines differ by
 * policy: persistent storage is granted (headless engines grant or refuse it by their own
 * heuristics, and a refusal opens a dialog), and fullscreen is refused (an engine in
 * fullscreen may take Esc to leave it instead of handing it to the page).
 */
export async function openApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    StorageManager.prototype.persisted = () => Promise.resolve(true);
    Element.prototype.requestFullscreen = () =>
      Promise.reject(new TypeError("fullscreen is refused in the e2e browser"));
  });
  await page.goto("/");
}
