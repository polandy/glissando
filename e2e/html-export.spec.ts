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
import { generatedClip } from "./support/clip";
import { silentTrack } from "./support/media";
import { chooseShareRow } from "./support/share";

test.use(GERMAN_BROWSER);

const TITLE = "Juli 2025";
const DAYS = ["2025-07-12", "2025-07-14"] as const;
const TRACK_SECONDS = 6;
/** The page's JSON block holding the slideshow, read back from the downloaded file. */
const SLIDESHOW_BLOCK = '<script type="application/json" id="slideshow">';
/** Nothing in the page may load from outside it. */
const EXTERNAL_SRC = 'src="http';
/** The player's own chunk, fetched on the first export: refusing it makes the export fail. */
const PLAYER_CHUNK = "**/assets/_virtual_glissando-export-player-*.js";
const CLIP_SECONDS = 2;
const CLIP_COLOUR = "#4db6ac";

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
  await chooseFiles(page, page.getByRole("button", { name: "Dateien wählen" }), [
    silentTrack("Sommerwind.wav", TRACK_SECONDS),
  ]);
  await expect(page.getByText("Sommerwind.wav", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Diashow erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);
}

test("E2E-033 a slideshow saved as a web page from its menu downloads as one .html that plays from file://", async ({
  page,
}, testInfo) => {
  await deliverByDownload(page);
  await openApp(page);
  await createSlideshowWithMusic(page);

  await chooseShareRow(page, /^Webseite/);
  const sheet = page.getByRole("dialog", { name: "Webseite" });
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

test("E2E-099 a failed web page export shows its title and sentence, with the raw error folded away until the details are opened", async ({
  page,
}) => {
  await openApp(page);
  await createSlideshowWithMusic(page);
  await page.route(PLAYER_CHUNK, (route) => route.abort());

  // The sheet loads the player chunk to weigh the sizes, so it fails as soon as it opens.
  await chooseShareRow(page, /^Webseite/);

  const failed = page.getByRole("dialog", { name: "Webseite nicht erstellt" });
  await expect(failed.getByText("Webseite nicht erstellt.", { exact: true })).toBeVisible();
  await expect(
    failed.getByText("Etwas ist schiefgegangen. Nichts wurde gespeichert."),
  ).toBeVisible();
  await expect(failed.getByRole("button", { name: "Noch einmal versuchen" })).toBeVisible();
  const toggle = failed.getByRole("button", { name: "Details anzeigen" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(failed.locator("code")).toHaveCount(0);

  await toggle.click();
  await expect(failed.getByRole("button", { name: "Details ausblenden" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(failed.locator("code")).toHaveText(/\S/);
});

test("E2E-101 the web page export preselects Standard for a slideshow with a clip, whose sizes hardly differ", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Only Chromium's test build encodes the H.264 clip the case imports",
  );
  await openApp(page);
  const clip = await generatedClip(page, "clip.mp4", CLIP_COLOUR, CLIP_SECONDS);
  await openImport(page);
  await chooseFiles(page, page.getByRole("button", { name: "Bilder auswählen" }), [clip]);
  await expect(page.getByText("1 Bilder", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);

  await chooseShareRow(page, /^Webseite/);
  const sheet = page.getByRole("dialog", { name: "Webseite" });
  await expect(sheet.getByRole("radio", { name: /^Standard/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(sheet.getByRole("radio", { name: /^Klein/ })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});

test("E2E-103 Esc in the web page sheet steps back to the Share sheet and leaves the page unmade", async ({
  page,
}) => {
  await openApp(page);
  await createSlideshowWithMusic(page);
  await chooseShareRow(page, /^Webseite/);
  const sheet = page.getByRole("dialog", { name: "Webseite" });
  await expect(sheet.getByRole("button", { name: "Webseite erstellen" })).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog", { name: "Teilen", exact: true })).toBeVisible();
  await expect(sheet).toBeHidden();
});
