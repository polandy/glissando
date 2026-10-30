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
