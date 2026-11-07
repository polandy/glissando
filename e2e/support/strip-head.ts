import type { Locator, Page } from "@playwright/test";

/** The group above the picture strip: its order line, count and Shuffle / Select / Add buttons (`StripHead.svelte`). */
export function stripHead(page: Page): Locator {
  return page.getByRole("group", { name: "Bilder", exact: true });
}

/** The picture strip's list (`PictureStrip.svelte`), named like the strip head above it. */
export function pictureList(page: Page): Locator {
  return page.getByRole("list", { name: "Bilder", exact: true });
}
