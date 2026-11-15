import { expect, test, type Page } from "@playwright/test";
import {
  choosePictures,
  editsStored,
  expectSlideshowScreen,
  GERMAN_BROWSER,
  openImport,
  selectionBar,
} from "./support/app";
import { openApp } from "./support/browser";
import { LANDSCAPE_PICTURE, PORTRAIT_PICTURE, pictureTakenOn } from "./support/media";

test.use(GERMAN_BROWSER);

/** Landscape, portrait, portrait, landscape: pictures 2 and 3 pair up. */
const PICTURES = [
  { day: "2025-07-12", colour: "#ffd54f", size: LANDSCAPE_PICTURE },
  { day: "2025-07-14", colour: "#e53935", size: PORTRAIT_PICTURE },
  { day: "2025-07-16", colour: "#1e88e5", size: PORTRAIT_PICTURE },
  { day: "2025-07-20", colour: "#43a047", size: LANDSCAPE_PICTURE },
] as const;

const SECOND = "Bild 2, aufgenommen am 14.07.2025";
const THIRD = "Bild 3, aufgenommen am 16.07.2025";
const PAIRED_SECOND = `${SECOND}, gezeigt als Paar mit Bild 3`;
const PAIRED_THIRD = `${THIRD}, gezeigt als Paar mit Bild 2`;
const FILLED = "über einer unscharfen Füllung";
/** A split marks the pair's second picture as always alone; the first simply stands alone. */
const SPLIT_SECOND = `${SECOND}, ${FILLED}`;
const ALONE_THIRD = `${THIRD}, allein gezeigt, ${FILLED}`;
const SPLIT_TOAST = "Bild 2 und 3 getrennt";
const REJOINED_TOAST = "Bild 2 und 3 wieder ein Paar";

const tile = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

async function expectPaired(page: Page): Promise<void> {
  await expect(tile(page, PAIRED_SECOND)).toBeVisible();
  await expect(tile(page, PAIRED_THIRD)).toBeVisible();
}

async function expectSplit(page: Page): Promise<void> {
  await expect(tile(page, SPLIT_SECOND)).toBeVisible();
  await expect(tile(page, ALONE_THIRD)).toBeVisible();
  await expect(page.getByRole("button", { name: /gezeigt als Paar/ })).toHaveCount(0);
}

test("E2E-134 a pair on the slideshow screen splits by its scissors or the bar's Split, undoes, stays split after a reload and pairs again", async ({
  page,
}) => {
  await openApp(page);
  const files = await Promise.all(
    PICTURES.map(({ day, colour, size }, index) =>
      pictureTakenOn(page, `picture-${index + 1}.jpg`, day, colour, size),
    ),
  );
  await openImport(page);
  await choosePictures(page, files, PICTURES.length);
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expectSlideshowScreen(page);
  await expectPaired(page);

  // The scissors between the two halves are offered once a picture of the pair is selected.
  await tile(page, PAIRED_THIRD).click();
  await page.getByRole("button", { name: "Bild 2 und 3 trennen", exact: true }).click();
  const toast = page.getByRole("status").filter({ hasText: SPLIT_TOAST });
  await expect(toast).toBeVisible();
  await expectSplit(page);
  await toast.getByRole("button", { name: "Rückgängig" }).click();
  await expectPaired(page);

  await selectionBar(page).getByRole("button", { name: "Trennen" }).click();
  await expectSplit(page);
  await editsStored(page);
  await page.reload();
  await expectSplit(page);

  await tile(page, ALONE_THIRD).click();
  await selectionBar(page).getByRole("button", { name: "Wieder als Paar" }).click();
  await expect(page.getByRole("status").filter({ hasText: REJOINED_TOAST })).toBeVisible();
  await expectPaired(page);
  await editsStored(page);
  await page.reload();
  await expectPaired(page);
});
