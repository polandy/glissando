import type { Locator, Page } from "@playwright/test";

/** The full-screen player, a dialog named by the slideshow's title. */
export function player(page: Page, title: string): Locator {
  return page.getByRole("dialog", { name: title });
}
