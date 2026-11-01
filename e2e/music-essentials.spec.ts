import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  chooseFiles,
  choosePictures,
  expectSlideshowScreen,
  GERMAN_BROWSER,
  openImport,
  picturesTakenOn,
} from "./support/app";
import { openApp } from "./support/browser";
import { silentTrack } from "./support/media";

/** The reference phone, a Pixel 9 Pro, in CSS pixels. */
const PHONE = { width: 412, height: 915 };

test.use({ ...GERMAN_BROWSER, viewport: PHONE });

/** Creates a slideshow of three pictures and two songs and opens its music editor. */
async function openMusicOfTwoSongs(page: Page): Promise<void> {
  await openApp(page);
  await openImport(page);
  await choosePictures(
    page,
    await picturesTakenOn(page, ["2025-07-12", "2025-07-14", "2025-07-20"]),
    3,
  );
  await page.getByRole("button", { name: "Weiter" }).click();
  await chooseFiles(page, page.getByRole("button", { name: "Dateien wählen" }), [
    silentTrack("Morgenlied.wav", 8),
    silentTrack("Abendlied.wav", 6),
  ]);
  await page.getByRole("button", { name: "Diashow erstellen" }).click();
  await expectSlideshowScreen(page);
  await page.getByRole("button", { name: "Musik 2 Songs" }).click();
}

async function box(locator: Locator): Promise<{ top: number; bottom: number }> {
  const rect = await locator.boundingBox();
  if (rect === null) throw new Error("the element has no box: it is not rendered");
  return { top: rect.y, bottom: rect.y + rect.height };
}

test("E2E-107 the music editor's Essentials on a phone show the songs, the music/pictures lane under them, then Repeat, with one Add a song and no waveform", async ({
  page,
}) => {
  const songs = page.getByRole("list", { name: "Songs" });
  const blocks = page.locator(".playlist-lane .block");
  const lane = page.locator(".playlist-timeline");
  const repeat = page.getByRole("switch", { name: "Musik wiederholen" });
  const addSong = page.getByRole("button", { name: "Song hinzufügen" });
  await openMusicOfTwoSongs(page);

  await expect(songs.getByRole("listitem").filter({ hasText: "Morgenlied" })).toBeVisible();
  await expect(blocks).toHaveCount(2);
  await expect(repeat).toBeVisible();
  await expect(page.getByRole("switch", { name: "Details" })).not.toBeChecked();
  await expect(addSong).toHaveCount(1);
  await expect(page.getByRole("slider", { name: "Ende" })).toHaveCount(0);

  const songsBox = await box(songs);
  const laneBox = await box(lane);
  const repeatBox = await box(repeat);
  expect(songsBox.bottom).toBeLessThanOrEqual(laneBox.top);
  expect(laneBox.bottom).toBeLessThanOrEqual(repeatBox.top);
});

test("E2E-108 an ⓘ button in the music editor opens its explanation and Esc closes it", async ({
  page,
}) => {
  const info = page.getByRole("button", { name: "Über Musik wiederholen" });
  const explanation = page.getByText(
    "Enden die Songs vor den Bildern, spielen sie wieder von vorn.",
  );
  await openMusicOfTwoSongs(page);
  await expect(info).toBeVisible();
  await expect(explanation).toBeHidden();

  await info.click();
  await expect(explanation).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(explanation).toBeHidden();
  await expect(info).toBeVisible();
});
