import { expect, test, type Page } from "@playwright/test";
import { ALL_FORMATS, BlobSource, Input } from "mediabunny";
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
/** The automatic picture times fit the slideshow to its music. */
const TRACK_SECONDS = 6;
/** Larger than an MP4's boxes alone: the file carries encoded frames. */
const MIN_VIDEO_BYTES = 10_000;
/** An MP4 starts with its `ftyp` box: a 4-byte size, then the type. */
const BOX_TYPE = { start: 4, end: 8 } as const;
/** One frame at 30 frames per second, in seconds. */
const FRAME_SECONDS = 1 / 30;

/**
 * Makes every engine deliver the finished video as a download: without a save picker the export
 * writes privately first (Chromium's picker is a native dialog a case cannot answer), and
 * without a share sheet for files the done state offers "Herunterladen".
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

test("E2E-030 a slideshow saved as a 720p video from its info panel downloads as an MP4 of its whole length", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(
    browserName === "firefox",
    "Playwright's Firefox can encode none of the export's presets: the sheet says it cannot create videos",
  );
  test.skip(
    browserName === "webkit",
    "Playwright's WebKit has no origin private file system, which the export writes to before the download",
  );
  test.slow();
  await deliverByDownload(page);
  await openApp(page);
  await createSlideshowWithMusic(page);

  await page.getByRole("button", { name: "Als Video sichern" }).click();
  const sheet = page.getByRole("dialog", { name: "Als Video sichern" });
  const small = sheet.getByRole("radio", { name: /^Klein/ });
  await expect(small).toHaveAttribute("aria-disabled", "false");
  await small.click();
  await expect(small).toHaveAttribute("aria-checked", "true");
  await sheet.getByRole("button", { name: "Video erstellen" }).click();

  const done = page.getByRole("dialog", { name: "Video ist fertig" });
  // Bounded by the test's timeout only: the CI image encodes in software, as fast as its load allows.
  await expect(done).toBeVisible({ timeout: 0 });
  await expect(done.getByText(`${TITLE} (720p).mp4`, { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await done.getByRole("button", { name: "Herunterladen" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`${TITLE} (720p).mp4`);

  const saved = testInfo.outputPath(file.suggestedFilename());
  await file.saveAs(saved);
  const bytes = readFileSync(saved);
  expect(bytes.length).toBeGreaterThan(MIN_VIDEO_BYTES);
  expect(new TextDecoder().decode(bytes.subarray(BOX_TYPE.start, BOX_TYPE.end))).toBe("ftyp");
  const input = new Input({
    source: new BlobSource(new Blob([new Uint8Array(bytes)])),
    formats: ALL_FORMATS,
  });
  const video = await input.getPrimaryVideoTrack();
  const audio = await input.getPrimaryAudioTrack();
  if (video === null || audio === null) {
    throw new Error("the video lacks a video or an audio track");
  }
  expect(video.displayWidth).toBe(1280);
  expect(video.displayHeight).toBe(720);
  for (const track of [video, audio]) {
    expect(Math.abs((await track.computeDuration()) - TRACK_SECONDS)).toBeLessThanOrEqual(
      FRAME_SECONDS,
    );
  }
});
