import { expect, type Page } from "@playwright/test";

/**
 * The strip's pictures in order, each named by its position and capture date ("12.07.2025"): the
 * tile's accessible name carries the date its printed label shows.
 */
export async function expectCapturedDates(page: Page, dates: readonly string[]): Promise<void> {
  const tiles = page.getByRole("button", { name: /^Bild \d+, aufgenommen am / });
  await expect(tiles).toHaveCount(dates.length);
  for (const [index, date] of dates.entries()) {
    await expect(tiles.nth(index)).toHaveAccessibleName(
      `Bild ${index + 1}, aufgenommen am ${date}`,
    );
  }
}
