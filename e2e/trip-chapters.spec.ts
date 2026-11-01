import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createSlideshowFromFiles,
  editsStored,
  GERMAN_BROWSER,
  picturesTakenAt,
  selectionBar,
} from "./support/app";
import { clickSwitch } from "./support/switch";
import { openApp } from "./support/browser";
import { TRIP } from "./support/trip";

test.use(GERMAN_BROWSER);

const SECOND_PICTURE = "Bild 2, aufgenommen am 13.07.2025";
const THIRD_PICTURE = "Bild 3, aufgenommen am 14.07.2025";

async function createTrip(page: Page): Promise<void> {
  await openApp(page);
  await createSlideshowFromFiles(page, await picturesTakenAt(page, TRIP));
}

/** A chapter's strip chip whose own text contains `text` — its title, or an edited title. */
function chapterChip(page: Page, text: string): Locator {
  return page.locator("button.chip").filter({ hasText: text });
}

/** The `<li>` a strip tile (chapter chip or picture) sits in, for an adjacency check. */
function tileOf(locator: Locator): Locator {
  return locator.locator("xpath=ancestor::li[1]");
}

test("E2E-077 a trip across two stays shows one automatic chapter right before the second stay, and an edited title persists until reset", async ({
  page,
}) => {
  const dialog = page.getByRole("dialog", { name: "Kapitel" });
  const titleField = dialog.getByRole("textbox", { name: "Titel", exact: true });
  const resetTitle = titleField.locator("xpath=following-sibling::button[1]");
  await createTrip(page);

  // Exactly one chapter chip exists at all, and it is Porto's: none before the opening stay.
  const porto = chapterChip(page, "Porto");
  await expect(page.locator("button.chip")).toHaveCount(1);
  await expect(porto).toContainText("Tag 3–4 · 14.–15. Juli");
  await expect(
    tileOf(porto)
      .locator("xpath=following-sibling::li[1]")
      .getByRole("button", { name: THIRD_PICTURE, exact: true }),
  ).toBeVisible();

  await porto.click();
  await expect(dialog).toBeVisible();
  await expect(titleField).toHaveValue("Porto");
  await expect(resetTitle).toHaveAttribute("aria-disabled", "true");

  await titleField.fill("Unser zweiter Halt");
  await expect(resetTitle).toHaveAttribute("aria-disabled", "false");
  await editsStored(page);
  await dialog.getByRole("button", { name: "Fertig" }).click();
  await expect(dialog).toBeHidden();
  await expect(chapterChip(page, "Unser zweiter Halt")).toHaveCount(1);

  // The edit survives a reload, then resetting brings the automatic title straight back.
  await page.reload();
  const edited = chapterChip(page, "Unser zweiter Halt");
  await expect(edited).toHaveCount(1);
  await edited.click();
  await expect(dialog).toBeVisible();
  await expect(titleField).toHaveValue("Unser zweiter Halt");

  await resetTitle.click();
  await expect(titleField).toHaveValue("Porto");
  await editsStored(page);
  await dialog.getByRole("button", { name: "Fertig" }).click();
  await expect(dialog).toBeHidden();
  await expect(chapterChip(page, "Porto")).toHaveCount(1);
});

test("E2E-078 inserting a chapter from the selection bar adds it right before the picture and it can be deleted; turning automatic chapters off drops only the automatic one", async ({
  page,
}) => {
  const addedDialog = page.getByRole("dialog", { name: "Eigenes Kapitel" });
  const titleField = addedDialog.getByRole("textbox", { name: "Titel", exact: true });
  const subtitleField = addedDialog.getByRole("textbox", { name: "Untertitel", exact: true });
  const secondPicture = page.getByRole("button", { name: SECOND_PICTURE, exact: true });
  const porto = chapterChip(page, "Porto");
  const lisbon = chapterChip(page, "Lisbon");
  await createTrip(page);

  await secondPicture.click();
  await expect(secondPicture).toHaveAttribute("aria-pressed", "true");
  await selectionBar(page).getByRole("button", { name: "Kapitel davor einfügen" }).click();
  await expect(addedDialog).toBeVisible();
  await expect(titleField).toHaveValue("Lisbon");
  await expect(subtitleField).toHaveValue("Tag 2 · Sonntag, 13. Juli");
  // The slideshow-wide switch lives in Fine settings, never in one chapter's sheet.
  await expect(addedDialog.getByRole("button", { name: "Kapitel löschen" })).toBeVisible();
  await expect(addedDialog.getByRole("switch", { name: "Reisekapitel" })).toHaveCount(0);
  await editsStored(page);
  await addedDialog.getByRole("button", { name: "Fertig" }).click();
  await expect(addedDialog).toBeHidden();

  await expect(lisbon).toHaveCount(1);
  await expect(
    tileOf(lisbon)
      .locator("xpath=following-sibling::li[1]")
      .getByRole("button", { name: SECOND_PICTURE, exact: true }),
  ).toBeVisible();

  // Porto's automatic chapter is the positive signal still in place before deleting the added one.
  await expect(porto).toHaveCount(1);
  await lisbon.click();
  await expect(addedDialog).toBeVisible();
  await addedDialog.getByRole("button", { name: "Kapitel löschen" }).click();
  await expect(addedDialog).toBeHidden();
  await expect(lisbon).toHaveCount(0);
  await expect(porto).toHaveCount(1);

  // Inserting and deleting a chapter never touched the selection: the picture is still picked,
  // so a plain click on it now would deselect it rather than re-select it (strip-selection.ts).
  await expect(secondPicture).toHaveAttribute("aria-pressed", "true");

  // Added again, so turning automatic chapters off can be shown to keep this one.
  await selectionBar(page).getByRole("button", { name: "Kapitel davor einfügen" }).click();
  await expect(addedDialog).toBeVisible();
  await editsStored(page);
  await addedDialog.getByRole("button", { name: "Fertig" }).click();
  await expect(addedDialog).toBeHidden();
  await expect(lisbon).toHaveCount(1);
  await expect(porto).toHaveCount(1);

  // The Trip chapters switch lives behind the Fine settings fold (ADR-0048).
  await page.getByRole("button", { name: "Weitere Einstellungen" }).click();
  const automaticSwitch = page.getByRole("switch", { name: "Reisekapitel" });
  await expect(automaticSwitch).toBeChecked();

  await clickSwitch(automaticSwitch);
  await expect(automaticSwitch).not.toBeChecked();
  await editsStored(page);

  await expect(lisbon).toHaveCount(1);
  await expect(porto).toHaveCount(0);
});
