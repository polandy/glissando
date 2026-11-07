import type { Locator, Page } from "@playwright/test";

/** The "new" badge's part of a tile name, for a picture added by Add media. */
const NEW_SUFFIX = ", neu";

/**
 * A picture strip tile's accessible name in German (`StripTile.svelte`): its position and capture
 * date (`dd.mm.yyyy`), plus `, neu` when `isNew`.
 */
export function tileName(number: number, date: string, { isNew = false } = {}): string {
  return `Bild ${String(number)}, aufgenommen am ${date}${isNew ? NEW_SUFFIX : ""}`;
}

/** The picture strip tile named exactly by `tileName`, so "Bild 1" never matches "Bild 1…, neu". */
export function tile(page: Page, number: number, date: string, { isNew = false } = {}): Locator {
  return page.getByRole("button", { name: tileName(number, date, { isNew }), exact: true });
}
