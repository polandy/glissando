import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  choosePictures,
  CREATED_TOAST,
  definitionOf,
  GERMAN_BROWSER,
  openImport,
  picturesTakenOn,
} from "./support/app";
import { openApp } from "./support/browser";
import { pictureTakenOn } from "./support/media";

test.use(GERMAN_BROWSER);

/** A strip tile's accessible name, matching any tile whether or not it carries the "new" badge. */
const ANY_TILE = /^Bild \d+, aufgenommen am \d{2}\.\d{2}\.\d{4}(, neu)?$/;

/** A strip tile named by its position and capture date; `isNew` for one added by Add pictures. */
function tile(page: Page, number: number, date: string, isNew = false): Locator {
  const name = `Bild ${number}, aufgenommen am ${date}${isNew ? ", neu" : ""}`;
  return page.getByRole("button", { name, exact: true });
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("E2E-032 adding pictures skips a duplicate and sorts the new ones in by capture date, with undo", async ({
  page,
}) => {
  const originals = await picturesTakenOn(page, ["2025-07-12", "2025-07-14", "2025-07-20"]);
  const reimportedOriginal = originals[1];
  if (reimportedOriginal === undefined) {
    throw new Error("expected three test pictures");
  }

  await openImport(page);
  await choosePictures(page, originals, 3);
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);

  await page.getByRole("button", { name: "Bilder hinzufügen" }).click();
  await expect(page.getByRole("heading", { name: "Bilder hinzufügen" })).toBeVisible();

  const between = await pictureTakenOn(page, "picture-between.jpg", "2025-07-13", "#4db6ac");
  const after = await pictureTakenOn(page, "picture-after.jpg", "2025-07-25", "#ffd54f");
  await choosePictures(page, [between, after, reimportedOriginal], 2);

  const duplicateNotice = page.getByRole("status").filter({ hasText: "picture-2.jpg" });
  await expect(duplicateNotice).toContainText(
    "1 Bild ist schon in der Diashow und wird übersprungen:",
  );
  await expect(duplicateNotice).toContainText("picture-2.jpg");
  await expect(
    duplicateNotice.getByRole("button", { name: "Trotzdem hinzufügen", exact: true }),
  ).toBeVisible();

  await expect(definitionOf(page, "Bilder")).toHaveText("3 → 5");
  const addButton = page.getByRole("button", { name: "2 hinzufügen", exact: true });
  await expect(addButton).toBeEnabled();

  await addButton.click();

  const addedToast = page.getByRole("status").filter({ hasText: "hinzugefügt" });
  await expect(addedToast).toContainText("2 Bilder hinzugefügt");
  await expect(page.getByRole("button", { name: ANY_TILE })).toHaveCount(5);
  await expect(tile(page, 1, "12.07.2025")).toBeVisible();
  await expect(tile(page, 2, "13.07.2025", true)).toBeVisible();
  await expect(tile(page, 3, "14.07.2025")).toBeVisible();
  await expect(tile(page, 4, "20.07.2025")).toBeVisible();
  await expect(tile(page, 5, "25.07.2025", true)).toBeVisible();

  await addedToast.getByRole("button", { name: "Rückgängig", exact: true }).click();

  await expect(tile(page, 1, "12.07.2025")).toBeVisible();
  await expect(tile(page, 2, "14.07.2025")).toBeVisible();
  await expect(tile(page, 3, "20.07.2025")).toBeVisible();
  await expect(page.getByRole("button", { name: ANY_TILE })).toHaveCount(3);
});
