import { expect, test } from "@playwright/test";
import {
  createSlideshow,
  editPicture,
  editsStored,
  GERMAN_BROWSER,
  leaveEditor,
} from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

test("E2E-025 the slideshow's default transition is chosen in the info panel, stored, followed by the picture editor and goes back to crossfade with undo", async ({
  page,
}) => {
  const defaultRow = page.getByRole("button", { name: "Übergänge Überblenden Vorgabe Ändern" });
  const pushRow = page.getByRole("button", { name: "Übergänge Schieben eigene Wahl Ändern" });
  const sheet = page.getByRole("dialog", { name: "Übergänge der Diashow" });
  const pushTile = sheet.getByRole("radio", { name: /Schieben/ });
  const crossfadeTile = sheet.getByRole("radio", { name: /Überblenden/ });
  const transitionSection = page.locator('section[aria-labelledby="transition-label"]');
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"], 5);

  await defaultRow.click();
  await expect(crossfadeTile).toHaveAttribute("aria-checked", "true");
  await pushTile.click();
  await expect(pushTile).toHaveAttribute("aria-checked", "true");
  await expect(sheet.getByText("Eigene Wahl")).toBeVisible();
  await editsStored(page);
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(sheet).toBeHidden();
  await expect(pushRow).toBeVisible();

  await page.reload();
  await expect(pushRow).toBeVisible();

  await editPicture(page, "Bild 1, aufgenommen am 12.07.2025");
  await expect(transitionSection.locator(".state")).toHaveText("Automatisch");
  await expect(transitionSection.getByRole("radio", { name: /Schieben/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(transitionSection).toContainText(
    "Automatisch gilt der Übergang der Diashow: Schieben.",
  );
  await leaveEditor(page);

  await pushRow.click();
  await sheet.getByRole("button", { name: "Zurück auf Überblenden" }).click();
  await expect(crossfadeTile).toHaveAttribute("aria-checked", "true");
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(defaultRow).toBeVisible();
  await page
    .getByRole("status")
    .filter({ hasText: "Übergänge wieder auf Überblenden" })
    .getByRole("button", { name: "Rückgängig" })
    .click();
  await expect(pushRow).toBeVisible();
});
