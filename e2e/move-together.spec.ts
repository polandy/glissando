import { expect, test, type Locator, type Page } from "@playwright/test";
import { createSlideshow, editsStored, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

/** Pointer travel split into steps, so a drag passes the strip's 8 px threshold as a hand does. */
const DRAG_STEPS = 8;

/** A tile of the picture strip, named by its position and capture date. */
function tile(page: Page, number: number, date: string) {
  return page.getByRole("button", { name: `Bild ${number}, aufgenommen am ${date}`, exact: true });
}

/** The tile's row, which carries the dashed drop mark (`StripTile.svelte`, `.tile`). */
function tileRow(page: Page, number: number, date: string): Locator {
  return tile(page, number, date).locator("xpath=..");
}

/**
 * A mouse drag of `from`'s tile onto the left quarter of `dropBefore`'s tile, which the strip
 * reads as "before" (`PictureStrip.hitTest`): press, move past the 8 px threshold, move to the
 * target, but stop short of releasing, so the caller can see the drop mark before it drops.
 */
async function dragOntoBefore(page: Page, from: Locator, dropBefore: Locator): Promise<void> {
  const fromBox = await from.boundingBox();
  const toBox = await dropBefore.boundingBox();
  if (fromBox === null || toBox === null) {
    throw new Error("a drag endpoint is not shown");
  }
  const start = { x: fromBox.x + fromBox.width / 2, y: fromBox.y + fromBox.height / 2 };
  const end = { x: toBox.x + toBox.width * 0.25, y: toBox.y + toBox.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // Crosses the drag threshold on its own, before heading for the drop target.
  await page.mouse.move(start.x + 20, start.y, { steps: 2 });
  await page.mouse.move(end.x, end.y, { steps: DRAG_STEPS });
}

test("E2E-035 several pictures are selected and gathered by the bar, moved together by a mouse drag, removed with one undo, across a reload", async ({
  page,
}) => {
  const selectionBar = page.getByRole("toolbar", { name: "Auswahl" });
  await openApp(page);
  await createSlideshow(
    page,
    ["2025-07-01", "2025-07-02", "2025-07-03", "2025-07-04", "2025-07-05", "2025-07-06"],
    2,
  );

  // Selecting several: three scattered tiles (dev-docs/APP.md, Selecting several).
  await page.getByRole("button", { name: "Auswählen" }).click();
  await tile(page, 2, "02.07.2025").click();
  await tile(page, 4, "04.07.2025").click();
  await tile(page, 6, "06.07.2025").click();
  await expect(selectionBar).toContainText("3 ausgewählt");

  // Earlier gathers the scattered selection where its first picture is (ADR-0019).
  await selectionBar.getByRole("button", { name: "Früher" }).click();
  await expect(tile(page, 1, "01.07.2025")).toBeVisible();
  await expect(tile(page, 2, "02.07.2025")).toBeVisible();
  await expect(tile(page, 3, "04.07.2025")).toBeVisible();
  await expect(tile(page, 4, "06.07.2025")).toBeVisible();
  await expect(tile(page, 5, "03.07.2025")).toBeVisible();
  await expect(tile(page, 6, "05.07.2025")).toBeVisible();

  // The gathered block (now at 2–4) is dragged as one onto the first tile, landing before it.
  await dragOntoBefore(page, tile(page, 2, "02.07.2025"), tile(page, 1, "01.07.2025"));
  await expect(tileRow(page, 1, "01.07.2025")).toHaveClass(/drop-before/);
  await page.mouse.up();
  await expect(tile(page, 1, "02.07.2025")).toBeVisible();
  await expect(tile(page, 2, "04.07.2025")).toBeVisible();
  await expect(tile(page, 3, "06.07.2025")).toBeVisible();
  await expect(tile(page, 4, "01.07.2025")).toBeVisible();
  await expect(tile(page, 5, "03.07.2025")).toBeVisible();
  await expect(tile(page, 6, "05.07.2025")).toBeVisible();

  // Removing several: the toast counts the whole group, and one Undo puts it all back.
  await selectionBar.getByRole("button", { name: "Entfernen" }).click();
  await expect(page.getByRole("status")).toContainText("3 Bilder entfernt");
  await expect(tile(page, 1, "02.07.2025")).toHaveCount(0);
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(tile(page, 1, "02.07.2025")).toBeVisible();
  await expect(tile(page, 2, "04.07.2025")).toBeVisible();
  await expect(tile(page, 3, "06.07.2025")).toBeVisible();
  await expect(tile(page, 4, "01.07.2025")).toBeVisible();
  await expect(tile(page, 5, "03.07.2025")).toBeVisible();
  await expect(tile(page, 6, "05.07.2025")).toBeVisible();

  // The order survives a reload.
  await editsStored(page);
  await page.reload();
  await expect(tile(page, 1, "02.07.2025")).toBeVisible();
  await expect(tile(page, 2, "04.07.2025")).toBeVisible();
  await expect(tile(page, 3, "06.07.2025")).toBeVisible();
  await expect(tile(page, 4, "01.07.2025")).toBeVisible();
  await expect(tile(page, 5, "03.07.2025")).toBeVisible();
  await expect(tile(page, 6, "05.07.2025")).toBeVisible();
});

// A touch hold-then-drag of a group (ADR-0019) is not run here: `playwright.config.ts` configures
// no touch or mobile project, so there is no engine to drive `hasTouch` events against, and the
// 450 ms hold would need a real wait without one. The gesture's logic (hold, lift, carry the
// selection, auto-scroll) is covered by `src/app/screens/slideshow/tile-drag.test.ts`, which
// drives it with an injected scheduler instead of real time.
