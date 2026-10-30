import { expect, test, type Locator, type Route } from "@playwright/test";
import { chooseFiles, GERMAN_BROWSER, picturesTakenOn } from "./support/app";
import { openApp } from "./support/browser";

// German carries the longest moods ("Warm · harmonisch · melancholisch").
test.use(GERMAN_BROWSER);

// The reference phone (dev-docs/library/SAMPLE_MUSIC.md, "The grid").
const PHONE = { width: 412, height: 915 };
const SAMPLE_TRACK_COUNT = 9;
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
    page.getByRole("button", { name: "Medien auswählen" }),
    await picturesTakenOn(page, ["2025-07-12", "2025-07-14"]),
  );
  await expect(page.getByText("2 Bilder", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByRole("heading", { name: "Welche Musik?" })).toBeVisible();
});

test("E2E-093 on a phone in German, every sample track's title and mood show in full below its cover, clear of play and +", async ({
  page,
}) => {
  await page.getByRole("button", { name: `Alle ${SAMPLE_TRACK_COUNT} zeigen` }).click();
  await expect(page.locator(".more")).toBeVisible();
  const cards = page.locator("li.card");
  await expect(cards).toHaveCount(SAMPLE_TRACK_COUNT);

  for (const card of await cards.all()) {
    const title = card.locator(".title");
    const mood = card.locator(".mood");
    const cover = card.locator(".cover");
    await expect(mood).not.toHaveText("");
    expect(await showsInFull(title), await title.innerText()).toBe(true);
    expect(await showsInFull(mood), await mood.innerText()).toBe(true);
    // The caption sits below the cover, so nothing on the cover can reach it.
    expect(await overlaps(cover, title), await title.innerText()).toBe(false);
    expect(await overlaps(cover, mood), await title.innerText()).toBe(false);
    for (const control of [card.locator(".play"), card.locator(".plus")]) {
      await expect(control).toBeVisible();
      expect(await overlaps(control, title), await title.innerText()).toBe(false);
    }
  }
});
