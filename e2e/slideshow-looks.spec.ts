import { expect, test, type Page } from "@playwright/test";
import { createSlideshow, editsStored, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

/** Opens the slideshow's info panel's Look sheet from its row, Film still unchosen. */
async function openLookSheet(page: Page): Promise<void> {
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"], 5);
  const defaultRow = page.getByRole("button", { name: "Look Ohne Vorgabe Ändern" });
  await expect(defaultRow).toBeVisible();
  await defaultRow.click();
}

test("E2E-077 choosing Film in the look sheet stores it, shows it in the row and keeps it after a reload", async ({
  page,
}) => {
  const filmRow = page.getByRole("button", { name: "Look Film Ändern" });
  const sheet = page.getByRole("dialog", { name: "Look" });
  const filmTile = sheet.getByRole("radio", { name: "Film" });

  await openLookSheet(page);
  await expect(sheet).toBeVisible();

  await filmTile.click();
  await expect(filmTile).toHaveAttribute("aria-checked", "true");
  await editsStored(page);
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(sheet).toBeHidden();
  await expect(filmRow).toBeVisible();

  await page.reload();
  await expect(filmRow).toBeVisible();
});

test("E2E-078 'Look entfernen' goes back to None and its undo brings the chosen look back", async ({
  page,
}) => {
  const defaultRow = page.getByRole("button", { name: "Look Ohne Vorgabe Ändern" });
  const filmRow = page.getByRole("button", { name: "Look Film Ändern" });
  const sheet = page.getByRole("dialog", { name: "Look" });
  const filmTile = sheet.getByRole("radio", { name: "Film" });
  const noneTile = sheet.getByRole("radio", { name: /Ohne/ });

  await openLookSheet(page);
  await filmTile.click();
  await editsStored(page);
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(filmRow).toBeVisible();

  await filmRow.click();
  await expect(filmTile).toHaveAttribute("aria-checked", "true");
  await sheet.getByRole("button", { name: "Look entfernen" }).click();
  await expect(noneTile).toHaveAttribute("aria-checked", "true");
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(defaultRow).toBeVisible();

  const toast = page.getByRole("status").filter({ hasText: "Look entfernt" });
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Rückgängig" }).click();
  await expect(filmRow).toBeVisible();
});
