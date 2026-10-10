import { expect, type Locator, type Page } from "@playwright/test";
import { pictureTakenOn, type TestFile } from "./media";

/** A German browser, so the copy a case asserts is the German catalogue's. */
export const GERMAN_BROWSER = { locale: "de-DE" } as const;

export const CREATED_TOAST = "Diashow erstellt — tippe auf Abspielen";

const PICTURE_COLOURS = ["#ff8a65", "#4db6ac", "#ffd54f", "#9575cd"] as const;

/** One JPEG per capture day, named after its position in `days`. */
export async function picturesTakenOn(page: Page, days: readonly string[]): Promise<TestFile[]> {
  return Promise.all(
    days.map((day, index) =>
      pictureTakenOn(
        page,
        `picture-${index + 1}.jpg`,
        day,
        PICTURE_COLOURS[index % PICTURE_COLOURS.length] ?? "#000000",
      ),
    ),
  );
}

/** Picks files the way a person does: the button opens the file chooser, which takes them. */
export async function chooseFiles(page: Page, button: Locator, files: TestFile[]): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await button.click();
  await (await chooser).setFiles(files);
}

/** The value a description list gives `term` (a <dt> and the <dd> after it). */
export function definitionOf(scope: Page | Locator, term: string): Locator {
  return scope
    .getByRole("term")
    .filter({ hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::dd[1]");
}

export function openImport(page: Page): Promise<void> {
  return page.getByRole("button", { name: "Neue Diashow" }).first().click();
}

/** Chooses `files` on the pictures step and waits until every picture is stored. */
export async function choosePictures(
  page: Page,
  files: TestFile[],
  storedCount: number,
): Promise<void> {
  await chooseFiles(page, page.getByRole("button", { name: "Bilder auswählen" }), files);
  await expect(page.getByText(`${storedCount} Bilder`, { exact: true })).toBeVisible();
}

/**
 * Imports pictures taken on `days` without music, each shown `secondsPerPicture`, and waits
 * on the created slideshow's screen.
 */
export async function createSlideshow(
  page: Page,
  days: readonly string[],
  secondsPerPicture: number,
): Promise<void> {
  const defaultSeconds = 5;
  const step = 0.5;
  await openImport(page);
  await choosePictures(page, await picturesTakenOn(page, days), days.length);
  await page.getByRole("button", { name: "Weiter" }).click();
  const stepper = page.getByRole("button", {
    name: secondsPerPicture < defaultSeconds ? "Kürzer" : "Länger",
  });
  const steps = Math.abs(secondsPerPicture - defaultSeconds) / step;
  for (let done = 0; done < steps; done += 1) {
    await stepper.click();
  }
  await expect(definitionOf(page, "je Bild")).toHaveText(`${secondsPerPicture} s`);
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);
}

/**
 * Waits until every edit is stored: the screen is busy from an edit until then, and that edit's
 * own result is asserted first, so the busy mark has been set by the time this checks it.
 */
export async function editsStored(page: Page): Promise<void> {
  await expect(page.locator(".screen")).toHaveAttribute("aria-busy", "false");
}

/** The picture editor's caption field. */
export function captionField(page: Page): Locator {
  return page.getByRole("textbox", { name: "Bildtitel" });
}

function selectionBar(page: Page): Locator {
  return page.getByRole("toolbar", { name: "Auswahl" });
}

/** Opens the picture editor of the picture whose tile is named `tile`; none may be selected. */
export async function editPicture(page: Page, tile: string): Promise<void> {
  const tileButton = page.getByRole("button", { name: tile, exact: true });
  await expect(tileButton).toHaveAttribute("aria-pressed", "false");
  await tileButton.click();
  await expect(tileButton).toHaveAttribute("aria-pressed", "true");
  await selectionBar(page).getByRole("button", { name: "Bearbeiten" }).click();
  await expect(captionField(page)).toBeVisible();
}

/**
 * Goes back from the picture editor, which leaves the edited picture selected, and ends the
 * selection, so the next `editPicture` starts with none.
 */
export async function leaveEditor(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await selectionBar(page).getByRole("button", { name: "Fertig" }).click();
  await expect(selectionBar(page)).toBeHidden();
}

/** Gives the picture whose tile is named `tile` a caption, stores it and goes back. */
export async function captionPicture(page: Page, tile: string, caption: string): Promise<void> {
  await editPicture(page, tile);
  await captionField(page).fill(caption);
  await expect(captionField(page)).toHaveValue(caption);
  await editsStored(page);
  await leaveEditor(page);
}
