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

/** Every strip tile's capture date (from its picture's accessible name), in the order shown. */
export async function capturedDates(page: Page): Promise<string[]> {
  const names = await page
    .getByRole("img", { name: /^Bild \d+, aufgenommen am / })
    .evaluateAll((pictures) => pictures.map((picture) => picture.getAttribute("alt") ?? ""));
  return names.map((name) => /(\d{2}\.\d{2}\.\d{4})/.exec(name)?.[1] ?? name);
}
