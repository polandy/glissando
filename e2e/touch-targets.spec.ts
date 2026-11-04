import { expect, test, type Locator, type Page } from "@playwright/test";
import { touchTargetViolations } from "../src/app/testing/touch-target";
import {
  chooseFiles,
  choosePictures,
  createSlideshowFromFiles,
  expectSlideshowScreen,
  GERMAN_BROWSER,
  openImport,
  picturesTakenAt,
  selectionBar,
} from "./support/app";
import { openApp } from "./support/browser";
import { generatedClip } from "./support/clip";
import { portraitTakenOn, stripedPictureTakenOn } from "./support/media";
import { chooseShareRow } from "./support/share";
import { TRIP } from "./support/trip";

/** A touch phone, 390 x 844 CSS pixels. */
const PHONE = { width: 390, height: 844 };
/** The smallest touch target (`--gl-hit-min`) in CSS pixels. */
const HIT_MIN_PX = 44;

test.use({ ...GERMAN_BROWSER, hasTouch: true, isMobile: true, viewport: PHONE });

async function heightOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("the control has no box");
  return box.height;
}

async function openSlideshow(page: Page): Promise<void> {
  await openApp(page);
  await openImport(page);
  await choosePictures(
    page,
    [
      portraitTakenOn("portrait.jpg", "2025-07-12"),
      await stripedPictureTakenOn(page, "stripes.jpg", "2025-07-14", "#4db6ac"),
    ],
    2,
  );
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expectSlideshowScreen(page);
  expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
}

test("E2E-114 on a touch phone the Fine settings row is 44 px tall and a tap still opens and closes it", async ({
  page,
}) => {
  await openSlideshow(page);

  const toggle = page.getByRole("button", { name: /^Weitere Einstellungen/ });
  await expect(toggle).toBeVisible();
  expect(await heightOf(toggle)).toBeGreaterThanOrEqual(HIT_MIN_PX);

  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.tap();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.tap();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("E2E-115 on a touch phone the focus sheet's filter pills are 44 px tall and a tap still filters", async ({
  page,
}) => {
  await openSlideshow(page);

  await page.getByRole("button", { name: "Mehr" }).click();
  await page.getByRole("menuitem", { name: /^Gesichter und Motive/ }).click();
  const sheet = page.getByRole("dialog", { name: "Gesichter und Motive" });
  await expect(sheet.getByText("Alle Bilder angesehen.", { exact: true })).toBeVisible({
    timeout: 0,
  });

  const pill = sheet.getByRole("button", { name: "Gesichter 1", exact: true });
  await expect(pill).toBeVisible();
  expect(await heightOf(pill)).toBeGreaterThanOrEqual(HIT_MIN_PX);

  await pill.tap();
  await expect(pill).toHaveAttribute("aria-pressed", "true");
});

/** The controls in `surface` whose 44 px square a tap does not land on, as the app renders them. */
function violationsIn(surface: Locator): Promise<string[]> {
  return surface.evaluate(touchTargetViolations);
}

test("E2E-119 on a touch phone every control of the app header and the library's cards owns a 44 px square", async ({
  page,
}) => {
  await openSlideshow(page);
  const header = page.getByRole("banner");
  await expect(header.getByRole("button", { name: "Zurück", exact: true })).toBeVisible();
  expect(await violationsIn(header)).toEqual([]);

  await header.getByRole("button", { name: "Zurück", exact: true }).click();
  const card = page.getByRole("listitem").filter({ hasText: "2 Bilder" });
  await expect(card).toBeVisible();
  expect(await violationsIn(page.locator("#app"))).toEqual([]);
});

test("E2E-120 on a touch phone every control of the web page and video export sheets owns a 44 px square", async ({
  page,
}) => {
  await openSlideshow(page);

  await chooseShareRow(page, /^Webseite/);
  const webPage = page.getByRole("dialog", { name: "Webseite" });
  await expect(webPage.getByRole("button", { name: "Webseite erstellen" })).toBeVisible();
  expect(await violationsIn(webPage)).toEqual([]);
  // Closing a format's sheet goes back to the Share sheet's list of formats.
  await page.keyboard.press("Escape");
  const share = page.getByRole("dialog", { name: "Teilen", exact: true });
  await share.getByRole("button", { name: /^Video/ }).click();
  const video = page.getByRole("dialog", { name: "Video" });
  // Settled either way: the sizes to choose from, or the note that this browser cannot make videos.
  await expect(video.getByRole("radio").first().or(video.getByRole("status"))).toBeVisible();
  expect(await violationsIn(video)).toEqual([]);
});

test("E2E-121 on a touch phone every control of the chapter sheet owns a 44 px square", async ({
  page,
}) => {
  await openApp(page);
  await createSlideshowFromFiles(page, await picturesTakenAt(page, TRIP));

  await page.locator("button.chip").filter({ hasText: "Porto" }).click();
  const sheet = page.getByRole("dialog", { name: "Kapitel" });
  await expect(sheet.getByRole("textbox", { name: "Titel", exact: true })).toBeVisible();
  expect(await violationsIn(sheet)).toEqual([]);
});

test("E2E-122 on a touch phone every control of the focus sheet owns a 44 px square", async ({
  page,
}) => {
  await openSlideshow(page);

  await page.getByRole("button", { name: "Mehr" }).click();
  await page.getByRole("menuitem", { name: /^Gesichter und Motive/ }).click();
  const sheet = page.getByRole("dialog", { name: "Gesichter und Motive" });
  await expect(sheet.getByText("Alle Bilder angesehen.", { exact: true })).toBeVisible({
    timeout: 0,
  });
  expect(await violationsIn(sheet)).toEqual([]);
});

test("E2E-123 on a touch phone every control of the clip editor owns a 44 px square", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "only Chromium's test build encodes the H.264 clip");
  await openApp(page);
  const clip = await generatedClip(page, "clip.mp4", "#4db6ac", 3);
  await openImport(page);
  await chooseFiles(page, page.getByRole("button", { name: "Bilder auswählen" }), [clip]);
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expectSlideshowScreen(page);

  await page.getByRole("button", { name: /^Bild 1, aufgenommen am/ }).click();
  await selectionBar(page).getByRole("button", { name: "Bearbeiten" }).click();
  await expect(page.getByText("Clip 1", { exact: true })).toBeVisible();
  expect(await violationsIn(page.locator("#app"))).toEqual([]);
});
