import { expect, test, type Locator, type Page } from "@playwright/test";
import { choosePictures, expectSlideshowScreen, GERMAN_BROWSER, openImport } from "./support/app";
import { openApp } from "./support/browser";
import { portraitTakenOn, stripedPictureTakenOn } from "./support/media";

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
