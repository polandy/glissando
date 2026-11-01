import { expect, type Locator, type Page } from "@playwright/test";
import type { ExifGps } from "../../src/import/exif-gps";
import { pictureTakenOnAt } from "./gps-media";
import { pictureTakenOn, type TestFile } from "./media";

/** A German browser, so the copy a case asserts is the German catalogue's. */
export const GERMAN_BROWSER = { locale: "de-DE" } as const;

/** The slideshow screen is shown, as right after creating a slideshow: its Play button is there. */
export async function expectSlideshowScreen(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "Abspielen" }).first()).toBeVisible();
}

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

/** One picture taken on `visit.day` at `visit.place`'s GPS coordinate, for a trip chapter to key off. */
export interface PlaceVisit {
  readonly day: string;
  readonly place: ExifGps;
}

/** One JPEG per `visits` entry, each carrying its day and GPS coordinate (TRIP_CHAPTERS.md, Rule B). */
export async function picturesTakenAt(
  page: Page,
  visits: readonly PlaceVisit[],
): Promise<TestFile[]> {
  return Promise.all(
    visits.map((visit, index) =>
      pictureTakenOnAt(
        page,
        `picture-${index + 1}.jpg`,
        visit.day,
        PICTURE_COLOURS[index % PICTURE_COLOURS.length] ?? "#000000",
        visit.place,
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

/** A new slideshow's stored own seconds (ADR-0050), what the Mood sheet's "Eigene" brings back. */
const CUSTOM_SECONDS_PER_PICTURE = 5;
const SECONDS_PER_PICTURE_STEP = 0.5;

/** Opens the slideshow's music editor via its "Musik …" tile, with or without music. */
async function openMusicEditor(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Musik/ }).click();
}

/** The music editor's picture-length section, with or without music. */
function pictureLengthSection(page: Page): Locator {
  return page.locator('section[aria-labelledby="music-picture-length"]');
}

/**
 * Leaves the slideshow's mood from the music editor's picture-length section ("Selbst
 * festlegen", MoodPictureTimesSection.svelte): the toast confirms it, and the section turns into
 * `PictureLengthSection`'s radios and stepper, starting at the mood's own seconds (ADR-0045).
 */
async function leaveMoodForOwnPictureTimes(page: Page): Promise<Locator> {
  const lengthSection = pictureLengthSection(page);
  await lengthSection.getByRole("button", { name: "Selbst festlegen" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Keine Stimmung ist an" })).toBeVisible();
  return lengthSection;
}

/** Steps `lengthSection`'s stepper from `fromSeconds` to `secondsPerPicture`, half a second at a time. */
async function stepOwnPictureSeconds(
  lengthSection: Locator,
  fromSeconds: number,
  secondsPerPicture: number,
): Promise<void> {
  const stepper = lengthSection.getByRole("button", {
    name: secondsPerPicture < fromSeconds ? "Kürzer" : "Länger",
  });
  const steps = Math.abs(secondsPerPicture - fromSeconds) / SECONDS_PER_PICTURE_STEP;
  for (let done = 0; done < steps; done += 1) {
    await stepper.click();
  }
}

/**
 * Sets `secondsPerPicture` on a just-created, music-less slideshow: "Eigene" in the Mood sheet,
 * which keeps the stored own seconds and transitions, then the music editor's stepper, which its
 * empty state shows under Custom.
 */
async function setPictureLengthWithoutMusic(page: Page, secondsPerPicture: number): Promise<void> {
  await chooseCustomMood(page);
  await openMusicEditor(page);
  await stepOwnPictureSeconds(
    pictureLengthSection(page),
    CUSTOM_SECONDS_PER_PICTURE,
    secondsPerPicture,
  );
  await editsStored(page);
  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await expect(page.getByRole("button", { name: "Musik Keine Musik hinzufügen" })).toBeVisible();
}

/**
 * Imports `files` without music and waits on the created slideshow's screen, left on Calm
 * (ADR-0050); with `secondsPerPicture`, sets it afterwards in the music editor instead
 * (`setPictureLengthWithoutMusic`).
 */
export async function createSlideshowFromFiles(
  page: Page,
  files: TestFile[],
  secondsPerPicture?: number,
): Promise<void> {
  await openImport(page);
  await choosePictures(page, files, files.length);
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expectSlideshowScreen(page);
  if (secondsPerPicture !== undefined) {
    await setPictureLengthWithoutMusic(page, secondsPerPicture);
  }
}

/**
 * Imports pictures taken on `days` without music and waits on the created slideshow's screen,
 * left on Calm; with `secondsPerPicture`, sets it afterwards (`createSlideshowFromFiles`).
 */
export async function createSlideshow(
  page: Page,
  days: readonly string[],
  secondsPerPicture?: number,
): Promise<void> {
  await createSlideshowFromFiles(page, await picturesTakenOn(page, days), secondsPerPicture);
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

/** The bar offering actions on the current selection (Edit, Insert chapter, Remove, Done). */
export function selectionBar(page: Page): Locator {
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

/**
 * Switches the slideshow's mood to Custom from the Mood sheet, so its own pacing (seconds per
 * picture, transitions) applies instead of a mood's (ADR-0045).
 */
export async function chooseCustomMood(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Stimmung/ }).click();
  const sheet = page.getByRole("dialog", { name: "Stimmung" });
  await sheet.getByRole("radio", { name: "Keine Stimmung" }).click();
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(sheet).toBeHidden();
}

/**
 * Imports three pictures with `track` and waits on the created slideshow's screen, left on Calm
 * (ADR-0050); with `fill`, afterwards leaves the mood in the music editor and sets the pictures
 * to fill the music there.
 */
export async function createSlideshowWithMusic(
  page: Page,
  track: TestFile,
  { fill = false } = {},
): Promise<void> {
  await openImport(page);
  await choosePictures(
    page,
    await picturesTakenOn(page, ["2025-07-12", "2025-07-14", "2025-07-20"]),
    3,
  );
  await page.getByRole("button", { name: "Weiter" }).click();
  await chooseFiles(page, page.getByRole("button", { name: "Dateien wählen" }), [track]);
  await expect(page.getByText(track.name, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Diashow erstellen" }).click();
  await expectSlideshowScreen(page);
  if (fill) {
    await openMusicEditor(page);
    const lengthSection = await leaveMoodForOwnPictureTimes(page);
    const fillRadio = lengthSection.getByRole("radio", { name: "Musik füllen" });
    await fillRadio.click();
    await expect(fillRadio).toHaveAttribute("aria-checked", "true");
    await editsStored(page);
    await page.getByRole("button", { name: "Zurück", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Musik/ })).toBeVisible();
  }
}
