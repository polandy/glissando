import { expect, test, type Locator, type Page, type Route } from "@playwright/test";
import { chooseFiles, GERMAN_BROWSER, picturesTakenOn } from "./support/app";
import { separatorRoom } from "../src/app/testing/separator-room";
import { openApp } from "./support/browser";

// German carries the longest moods ("Warm · harmonisch · melancholisch").
test.use(GERMAN_BROWSER);

// The reference phone (dev-docs/library/SAMPLE_MUSIC.md, "The grid").
const PHONE = { width: 412, height: 915 };
// The owner's laptop (MacBook Air), where a third of the panel made each cover far too large.
const LAPTOP = { width: 1470, height: 956 };
const SAMPLE_TRACK_COUNT = 9;
const PHONE_COLUMNS = 3;
// A cover's width range on a laptop: 140 px up to the widest of five columns with 12 px gaps.
const TILE_MIN_PX = 140;
const TILE_MAX_PX = 171;
// The sample-music base URL every build defaults to; no byte of it leaves the machine.
const SAMPLE_MUSIC_BASE_URL = "https://polandy.github.io/glissando-assets/music/";

/** Firefox rounds a wrapped text box's scroll size up by a pixel; a cut line is ~15 px. */
const SUBPIXEL_ROUNDING_PX = 1;

/** Whether `text` shows all of itself: nothing clipped, clamped or cut with an ellipsis. */
const showsInFull = (text: Locator): Promise<boolean> =>
  text.evaluate(
    (element, tolerance) =>
      element.scrollWidth <= element.clientWidth + tolerance &&
      element.scrollHeight <= element.clientHeight + tolerance,
    SUBPIXEL_ROUNDING_PX,
  );

async function overlaps(a: Locator, b: Locator): Promise<boolean> {
  const boxA = await a.boundingBox();
  const boxB = await b.boundingBox();
  if (boxA === null || boxB === null) throw new Error("a card part is not rendered");
  return (
    boxA.x < boxB.x + boxB.width &&
    boxB.x < boxA.x + boxA.width &&
    boxA.y < boxB.y + boxB.height &&
    boxB.y < boxA.y + boxA.height
  );
}

test.beforeEach(async ({ page }) => {
  await page.route(`${SAMPLE_MUSIC_BASE_URL}**`, (route: Route) => route.abort());
  await openApp(page);
  await page.setViewportSize(PHONE);
  await page.getByRole("button", { name: "Neue Diashow" }).first().click();
  await chooseFiles(
    page,
    page.getByRole("button", { name: "Bilder auswählen" }),
    await picturesTakenOn(page, ["2025-07-12", "2025-07-14"]),
  );
  await expect(page.getByText("2 Bilder", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByRole("heading", { name: "Welche Musik?" })).toBeVisible();
});

/** Every sample track card of the Glissando-music block. */
function sampleCards(page: Page): Locator {
  return page.getByRole("region", { name: "Glissando-Musik" }).getByRole("listitem");
}

test("E2E-093 on a phone in German, every sample track's title and mood show in full below its cover, clear of play and +", async ({
  page,
}) => {
  await page.getByRole("button", { name: `Alle ${SAMPLE_TRACK_COUNT} zeigen` }).click();
  await expect(page.getByTestId("sample-more")).toBeVisible();
  const cards = sampleCards(page);
  await expect(cards).toHaveCount(SAMPLE_TRACK_COUNT);

  for (const card of await cards.all()) {
    const title = card.getByTestId("sample-card-title");
    const mood = card.getByTestId("sample-card-mood");
    const cover = card.getByTestId("sample-card-cover");
    await expect(mood).not.toHaveText("");
    expect(await showsInFull(title), await title.innerText()).toBe(true);
    expect(await showsInFull(mood), await mood.innerText()).toBe(true);
    // The caption sits below the cover, so nothing on the cover can reach it.
    expect(await overlaps(cover, title), await title.innerText()).toBe(false);
    expect(await overlaps(cover, mood), await title.innerText()).toBe(false);
    for (const control of [
      card.getByRole("button", { name: /abspielen$/ }),
      card.getByRole("button", { name: /hinzufügen$/ }),
    ]) {
      await expect(control).toBeVisible();
      expect(await overlaps(control, title), await title.innerText()).toBe(false);
    }
  }
});

test("E2E-125 on a phone in German, every dot in a sample track's mood gets room around it and stays within the mood's width", async ({
  page,
}) => {
  await page.getByRole("button", { name: `Alle ${SAMPLE_TRACK_COUNT} zeigen` }).click();
  const cards = sampleCards(page);
  await expect(cards).toHaveCount(SAMPLE_TRACK_COUNT);

  for (const card of await cards.all()) {
    const mood = card.getByTestId("sample-card-mood");
    const separators = mood.getByTestId("separator");
    await expect(separators.first()).toBeAttached();
    const label = await mood.innerText();
    const moodBox = await mood.boundingBox();
    if (moodBox === null) throw new Error("a mood is not rendered");
    for (const separator of await separators.all()) {
      expect(await separator.evaluate(separatorRoom), label).toBeGreaterThan(0);
      const box = await separator.boundingBox();
      if (box === null) throw new Error("a dot is not rendered");
      expect(box.x, label).toBeGreaterThanOrEqual(moodBox.x - SUBPIXEL_ROUNDING_PX);
      expect(box.x + box.width, label).toBeLessThanOrEqual(
        moodBox.x + moodBox.width + SUBPIXEL_ROUNDING_PX,
      );
    }
  }
});

test("E2E-127 on a laptop, the sample track covers stay about 140 px wide in more than three columns", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP);
  await page.getByRole("button", { name: `Alle ${SAMPLE_TRACK_COUNT} zeigen` }).click();
  await expect(page.getByTestId("sample-more")).toBeVisible();
  const covers = sampleCards(page).getByTestId("sample-card-cover");
  await expect(covers).toHaveCount(SAMPLE_TRACK_COUNT);

  const boxes = await Promise.all((await covers.all()).map((cover) => cover.boundingBox()));
  const lefts = new Set(boxes.map((box) => box?.x));
  expect(lefts.size).toBeGreaterThan(PHONE_COLUMNS);
  const widths = boxes.map((box) => box?.width ?? 0);
  expect(widths.filter((width) => width < TILE_MIN_PX || width >= TILE_MAX_PX)).toEqual([]);
});
