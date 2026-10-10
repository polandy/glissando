import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  chooseFiles,
  choosePictures,
  CREATED_TOAST,
  GERMAN_BROWSER,
  openImport,
  picturesTakenOn,
} from "./support/app";
import { openApp } from "./support/browser";
import { silentTrack } from "./support/media";

test.use(GERMAN_BROWSER);

const TITLE = "Juli 2025";
const DAYS = ["2025-07-12", "2025-07-14"] as const;
const TRACK_SECONDS = 6;
/** The page's JSON block holding the slideshow, read back from the downloaded file. */
const SLIDESHOW_BLOCK = '<script type="application/json" id="slideshow">';
/** Nothing in the page may load from outside it. */
const EXTERNAL_SRC = 'src="http';

/**
 * Makes every engine deliver the finished page as a download, as the video export's own case
 * does: without a save picker (Chromium's picker is a native dialog a case cannot answer) and
 * without a share sheet for files, the done state offers "Herunterladen".
 */
async function deliverByDownload(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Window.prototype, "showSaveFilePicker");
    Reflect.deleteProperty(window, "showSaveFilePicker");
    Navigator.prototype.canShare = () => false;
  });
}

async function createSlideshowWithMusic(page: Page): Promise<void> {
  await openImport(page);
  await choosePictures(page, await picturesTakenOn(page, DAYS), DAYS.length);
  await page.getByRole("button", { name: "Weiter" }).click();
  await chooseFiles(page, page.getByRole("button", { name: "Musik auswählen" }), [
    silentTrack("Sommerwind.wav", TRACK_SECONDS),
  ]);
  await expect(page.getByText("Sommerwind.wav", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Diashow erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);
}

test("E2E-033 a slideshow saved as a web page from its info panel downloads as one .html that plays from file://", async ({
  page,
}, testInfo) => {
  await deliverByDownload(page);
  await openApp(page);
  await createSlideshowWithMusic(page);

  await page.getByRole("button", { name: "Als Webseite sichern" }).click();
  const sheet = page.getByRole("dialog", { name: "Als Webseite sichern" });
  // The default size: small is kept as is, so the page fits the usual estimate.
  await expect(sheet.getByRole("radio", { name: /^Klein/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await sheet.getByRole("button", { name: "Webseite erstellen" }).click();

  const done = page.getByRole("dialog", { name: "Die Webseite ist fertig" });
  await expect(done).toBeVisible({ timeout: 0 });
  await expect(done.getByText(`${TITLE}.html`, { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await done.getByRole("button", { name: "Herunterladen" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`${TITLE}.html`);

  const saved = testInfo.outputPath(file.suggestedFilename());
  await file.saveAs(saved);
  const html = new TextDecoder().decode(readFileSync(saved));
  expect(html).toContain(SLIDESHOW_BLOCK);
  expect(html).not.toContain(EXTERNAL_SRC);

  const filePage = await page.context().newPage();
  await filePage.goto(`file://${encodeURI(saved)}`);
  await expect(filePage.locator("html")).toHaveAttribute("data-state", "start");
  await filePage.getByRole("button", { name: "Abspielen" }).click();
  await expect(filePage.locator("html")).toHaveAttribute("data-state", "playing");
});
