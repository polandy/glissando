import { expect, test, type Page } from "@playwright/test";
import { createSlideshow, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

/**
 * Waits until every edit is stored: the screen is busy from an edit until then, and that edit's
 * own result is asserted first, so the busy mark has been set by the time this checks it.
 */
async function editsStored(page: Page): Promise<void> {
  await expect(page.locator(".screen")).toHaveAttribute("aria-busy", "false");
}

/** A tile of the picture strip, named by its position and capture date. */
function tile(page: Page, number: number, date: string) {
  return page.getByRole("button", { name: `Bild ${number}, aufgenommen am ${date}` });
}

test("E2E-014 pictures are removed with undo, reordered and renamed across a reload, and the slideshow deleted", async ({
  page,
}) => {
  const selectionBar = page.getByRole("toolbar", { name: "Ausgewähltes Bild" });
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"], 2);
  await expect(page.getByText("Nach Aufnahmedatum sortiert")).toBeVisible();

  await tile(page, 2, "14.07.2025").click();
  await selectionBar.getByRole("button", { name: "Entfernen" }).click();
  await expect(page.getByRole("status")).toContainText("Bild entfernt");
  await expect(tile(page, 2, "20.07.2025")).toBeVisible();
  await expect(tile(page, 2, "14.07.2025")).toHaveCount(0);
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(tile(page, 2, "14.07.2025")).toBeVisible();
  await expect(tile(page, 3, "20.07.2025")).toBeVisible();

  await tile(page, 1, "12.07.2025").click();
  await selectionBar.getByRole("button", { name: "Später" }).click();
  await expect(tile(page, 1, "14.07.2025")).toBeVisible();
  await expect(tile(page, 2, "12.07.2025")).toBeVisible();
  await expect(page.getByText("Eigene Reihenfolge")).toBeVisible();
  await selectionBar.getByRole("button", { name: "Fertig" }).click();

  await page.getByRole("button", { name: "Titel umbenennen" }).click();
  await page.getByRole("textbox", { name: "Titel" }).fill("Sommer am See");
  await page.getByRole("textbox", { name: "Titel" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Sommer am See" })).toBeVisible();
  await editsStored(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sommer am See" })).toBeVisible();
  await expect(tile(page, 1, "14.07.2025")).toBeVisible();
  await expect(tile(page, 2, "12.07.2025")).toBeVisible();
  await expect(tile(page, 3, "20.07.2025")).toBeVisible();
  await expect(page.getByText("Eigene Reihenfolge")).toBeVisible();

  await tile(page, 3, "20.07.2025").click();
  await selectionBar.getByRole("button", { name: "Entfernen" }).click();
  await expect(tile(page, 3, "20.07.2025")).toHaveCount(0);
  await editsStored(page);
  await page.reload();
  await expect(tile(page, 2, "12.07.2025")).toBeVisible();
  await expect(tile(page, 3, "20.07.2025")).toHaveCount(0);

  await page.getByRole("button", { name: "Mehr" }).click();
  await page.getByRole("menuitem", { name: "Diashow löschen …" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("„Sommer am See“ löschen?");
  await expect(dialog).toContainText("2 Bilder");
  await dialog.getByRole("button", { name: "Löschen" }).click();

  await expect(page.getByRole("status")).toHaveText("Diashow gelöscht");
  await expect(page.getByRole("button", { name: "Neue Diashow" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Sommer am See/ })).toHaveCount(0);
});
