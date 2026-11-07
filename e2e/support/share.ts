import type { Locator, Page } from "@playwright/test";

/** Opens the Share sheet from the info panel's Share button. */
export async function openShare(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Teilen", exact: true }).click();
  return page.getByRole("dialog", { name: "Teilen", exact: true });
}

/** Opens the Share sheet and chooses one of its rows by the start of its name. */
export async function chooseShareRow(page: Page, name: RegExp): Promise<void> {
  const chooser = await openShare(page);
  await chooser.getByRole("button", { name }).click();
}

/**
 * Makes every engine deliver a finished export as a download: without a save picker (Chromium's
 * picker is a native dialog a case cannot answer; a video export then writes privately first) and
 * without a share sheet for files, the done state offers "Herunterladen".
 */
export async function deliverByDownload(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Window.prototype, "showSaveFilePicker");
    Reflect.deleteProperty(window, "showSaveFilePicker");
    Navigator.prototype.canShare = () => false;
  });
}
