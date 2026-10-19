import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  chooseFiles,
  choosePictures,
  CREATED_TOAST,
  GERMAN_BROWSER,
  openImport,
} from "./support/app";
import { openApp } from "./support/browser";
import { pictureTakenOn, type TestFile } from "./support/media";

test.use(GERMAN_BROWSER);

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

/** A strip tile named by its position and capture date (IMPORT_ARRANGING.md, Arranging). */
function tile(page: Page, number: number, date: string): Locator {
  return page.getByRole("button", { name: `Bild ${number}, aufgenommen am ${date}`, exact: true });
}

/** Every tile's `.date` text, in the order the strip shows them. */
function dates(page: Page): Locator {
  return page.getByRole("listitem").locator(".date");
}

/** The dashed add tile that opens "Add pictures" (`AddPicturesMenu.svelte`, `tile` variant). */
function addTile(page: Page): Locator {
  return page.locator("ol.strip > li").filter({ hasText: "Hinzufügen" });
}

/** Opens an "Add pictures" menu (the strip head's or the add tile's) and picks "Bilder und Videos". */
async function addMorePictures(page: Page, opener: Locator, files: TestFile[]): Promise<void> {
  await opener.click();
  const addPicturesAndVideos = page.getByRole("menuitem", {
    name: "Bilder und Videos",
    exact: true,
  });
  await chooseFiles(page, addPicturesAndVideos, files);
}

test("E2E-072 pictures added, moved and shuffled while arranging a new slideshow keep their order into the editor", async ({
  page,
}) => {
  const selectionBar = page.getByRole("toolbar", { name: "Auswahl" });
  await openImport(page);

  // Steps 1-2: four pictures, chosen scrambled so the sort into capture order is visible.
  const scrambled = await Promise.all(
    (
      [
        ["picture-20th.jpg", "2025-07-20", "#ff8a65"],
        ["picture-12th.jpg", "2025-07-12", "#4db6ac"],
        ["picture-18th.jpg", "2025-07-18", "#ffd54f"],
        ["picture-14th.jpg", "2025-07-14", "#9575cd"],
      ] as const
    ).map(([name, day, colour]) => pictureTakenOn(page, name, day, colour)),
  );
  await choosePictures(page, scrambled, 4);

  await expect(page.getByText("Aufnahmereihenfolge")).toBeVisible();
  await expect(dates(page)).toHaveText(["12.07.2025", "14.07.2025", "18.07.2025", "20.07.2025"]);

  // Step 3: add more while arranging, via the strip head's "Add pictures" menu; sorted in by date.
  const between = await pictureTakenOn(page, "picture-13th.jpg", "2025-07-13", "#ff8a65");
  const laterStill = await pictureTakenOn(page, "picture-22nd.jpg", "2025-07-22", "#4db6ac");
  await addMorePictures(
    page,
    page.getByRole("button", { name: "Bilder hinzufügen", exact: true }),
    [between, laterStill],
  );

  await expect(dates(page)).toHaveText([
    "12.07.2025",
    "13.07.2025",
    "14.07.2025",
    "18.07.2025",
    "20.07.2025",
    "22.07.2025",
  ]);
  await expect(addTile(page)).toBeVisible();
  await expect(addTile(page).locator("xpath=following-sibling::li")).toHaveCount(0);

  // Step 4: moving a tile makes the order the user's own.
  await tile(page, 1, "12.07.2025").click();
  await expect(selectionBar).toBeVisible();
  await selectionBar.getByRole("button", { name: "Später" }).click();
  await expect(dates(page)).toHaveText([
    "13.07.2025",
    "12.07.2025",
    "14.07.2025",
    "18.07.2025",
    "20.07.2025",
    "22.07.2025",
  ]);
  await expect(page.getByText("Eigene Reihenfolge")).toBeVisible();
  await selectionBar.getByRole("button", { name: "Fertig" }).click();

  // Step 5: once the order is the user's own, an added picture goes at the end, not sorted in.
  const veryEarly = await pictureTakenOn(page, "picture-1st.jpg", "2025-07-01", "#ffd54f");
  await addMorePictures(page, addTile(page).getByRole("button"), [veryEarly]);
  await expect(tile(page, 7, "01.07.2025")).toBeVisible();
  await expect(dates(page)).toHaveText([
    "13.07.2025",
    "12.07.2025",
    "14.07.2025",
    "18.07.2025",
    "20.07.2025",
    "22.07.2025",
    "01.07.2025",
  ]);

  // Step 6: Shuffle keeps every picture and the user's own order, without asserting any one order.
  const beforeShuffle = await dates(page).allTextContents();
  await page.getByRole("button", { name: "Mischen", exact: true }).click();
  await expect(dates(page)).toHaveCount(7);
  const afterShuffle = await dates(page).allTextContents();
  expect(new Set(afterShuffle)).toEqual(new Set(beforeShuffle));
  await expect(page.getByText("Eigene Reihenfolge")).toBeVisible();

  // Step 7: F opens the focused tile full screen, Escape closes it, Delete removes it.
  const firstDate = afterShuffle[0];
  if (firstDate === undefined) {
    throw new Error("expected a tile after the shuffle");
  }
  const firstTile = tile(page, 1, firstDate);
  await firstTile.focus();
  await expect(firstTile).toBeFocused();
  await firstTile.press("f");
  const viewer = page.getByRole("dialog", { name: `Bild vom ${firstDate}` });
  await expect(viewer).toBeVisible();
  // The viewer steps through the strip's arranged order, not the import's.
  await expect(viewer.getByText("1 von 7", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: `Bild vom ${afterShuffle[1]}` })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(viewer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(firstTile).toBeFocused();

  await page.keyboard.press("Delete");
  const stripTiles = page.getByRole("button", {
    name: /^Bild \d+, aufgenommen am \d{2}\.\d{2}\.\d{4}$/,
  });
  await expect(stripTiles).toHaveCount(6);
  const finalOrder = await dates(page).allTextContents();

  // Step 8: the arranged order is stored and carries into the editor.
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByRole("heading", { name: "Welche Musik?" })).toBeVisible();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);

  await expect(dates(page)).toHaveText(finalOrder);
});
