import { expect, type Page } from "@playwright/test";
import { CREATED_TOAST, openImport } from "./app";
import { LIBRARY_PAGE } from "./fake-glissando-server";

/** Makes a slideshow on the fake server from its Immich photos, and stays on its screen. */
export async function createServerSlideshow(page: Page): Promise<void> {
  await openImport(page);
  await page.getByRole("button", { name: /^Glissando-Server/ }).click();
  await page.getByRole("button", { name: "Immich öffnen" }).click();
  for (const { originalFileName } of LIBRARY_PAGE.assets.items) {
    await page.getByRole("button", { name: originalFileName, exact: true }).click();
  }
  await page.locator(".actions").getByRole("button", { name: "3 hinzufügen" }).click();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expect(page.getByRole("status").filter({ hasText: CREATED_TOAST })).toBeVisible();
}
