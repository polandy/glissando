import { expect, test } from "@playwright/test";
import { createSlideshow, editsStored, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { tile } from "./support/strip";

test.use(GERMAN_BROWSER);

test("E2E-014 pictures are removed with undo, reordered and renamed across a reload, and the slideshow deleted", async ({
  page,
}) => {
  const selectionBar = page.getByRole("toolbar", { name: "Auswahl" });
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
  await expect(page.getByText("Deine Reihenfolge")).toBeVisible();
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
  await expect(page.getByText("Deine Reihenfolge")).toBeVisible();

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
  await page.reload();
  await expect(page.getByRole("heading", { name: "Bilder rein, Diashow raus." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sommer am See/ })).toHaveCount(0);
});
