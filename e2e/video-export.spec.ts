// Spec: docs/dev/video_export/SHEET.md
import { expect, test } from "@playwright/test";
import { ALL_FORMATS, BlobSource, Input } from "mediabunny";
import { readFileSync } from "node:fs";
import {
  chooseFiles,
  createSlideshowWithMusic,
  editsStored,
  expectSlideshowScreen,
  GERMAN_BROWSER,
  openImport,
} from "./support/app";
import { CARD_SLIDE_MS } from "../src/compose/card-slide";
import { openApp } from "./support/browser";
import { generatedClip } from "./support/clip";
import { silentTrack } from "./support/media";
import { chooseShareRow, deliverByDownload } from "./support/share";

test.use(GERMAN_BROWSER);

const TITLE = "Juli 2025";
const DAYS = ["2025-07-12", "2025-07-14"] as const;
/** "Musik füllen" fits the picture times to its music. */
const TRACK_SECONDS = 6;
const MUSIC = silentTrack("Sommerwind.wav", TRACK_SECONDS);
/** Larger than an MP4's boxes alone: the file carries encoded frames. */
const MIN_VIDEO_BYTES = 10_000;
/** An MP4 starts with its `ftyp` box: a 4-byte size, then the type. */
const BOX_TYPE = { start: 4, end: 8 } as const;
/** One frame at 30 frames per second, in seconds. */
const FRAME_SECONDS = 1 / 30;

test("E2E-030 a slideshow saved as a 720p video from its menu downloads as an MP4 of its whole length", async ({
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
  await createSlideshowWithMusic(page, MUSIC, { days: DAYS, fill: true });

  await chooseShareRow(page, /^Video/);
  const sheet = page.getByRole("dialog", { name: "Video" });
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

test("E2E-100 the video sheet notes that the Opus sound does not play on Apple devices", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Only Chromium's test build lacks an AAC encoder, so the video gets Opus sound",
  );
  await openApp(page);
  await createSlideshowWithMusic(page, MUSIC, { days: DAYS, fill: true });

  await chooseShareRow(page, /^Video/);
  const sheet = page.getByRole("dialog", { name: "Video" });
  await expect(sheet.getByRole("button", { name: "Video erstellen" })).toBeVisible();
  await expect(
    sheet.getByText(
      "Läuft aus diesem Browser nicht auf iPhone, iPad oder Apple TV. Dafür in Safari erstellen.",
    ),
  ).toBeVisible();
});

const CLIP_SECONDS = 3;
const CLIP_COLOUR = "#4db6ac";
const CARD_TITLE = "Sommerurlaub";
/** The opening card is a slide of its own before a clip, which is never lengthened for it. */
const MIN_CLIP_AND_CARD_SECONDS = CLIP_SECONDS + CARD_SLIDE_MS / 1000;

test("E2E-142 a slideshow with a clip and a title card saved as a video downloads as an MP4 of the whole show, card included", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== "chromium",
    "Only Chromium's test build encodes the H.264 clip the case imports and exports",
  );
  test.slow();
  await deliverByDownload(page);
  await openApp(page);
  const clip = await generatedClip(page, "clip.mp4", CLIP_COLOUR, CLIP_SECONDS);
  await openImport(page);
  await chooseFiles(page, page.getByRole("button", { name: "Bilder auswählen" }), [clip]);
  await expect(page.getByText("1 Bilder", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expectSlideshowScreen(page);

  await page.getByRole("button", { name: "Titelbild", exact: true }).click();
  const card = page.getByRole("dialog");
  await card.getByRole("textbox", { name: "Titel", exact: true }).fill(CARD_TITLE);
  await expect(card.getByText(CARD_TITLE)).toBeVisible();
  await editsStored(page);
  await card.getByRole("button", { name: "Fertig" }).click();
  await expect(card).toBeHidden();

  await chooseShareRow(page, /^Video/);
  const sheet = page.getByRole("dialog", { name: "Video" });
  const small = sheet.getByRole("radio", { name: /^Klein/ });
  await expect(small).toHaveAttribute("aria-disabled", "false");
  await small.click();
  await sheet.getByRole("button", { name: "Video erstellen" }).click();

  const done = page.getByRole("dialog", { name: "Video ist fertig" });
  await expect(done).toBeVisible({ timeout: 0 });
  const download = page.waitForEvent("download");
  await done.getByRole("button", { name: "Herunterladen" }).click();
  const file = await download;

  const saved = testInfo.outputPath(file.suggestedFilename());
  await file.saveAs(saved);
  const input = new Input({
    source: new BlobSource(new Blob([new Uint8Array(readFileSync(saved))])),
    formats: ALL_FORMATS,
  });
  const video = await input.getPrimaryVideoTrack();
  if (video === null) {
    throw new Error("the video lacks a video track");
  }
  expect(video.displayWidth).toBe(1280);
  expect(video.displayHeight).toBe(720);
  expect(await video.computeDuration()).toBeGreaterThanOrEqual(MIN_CLIP_AND_CARD_SECONDS);
});
