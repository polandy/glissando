import { expect, test, type Locator, type Page } from "@playwright/test";
import { chooseFiles, expectSlideshowScreen, GERMAN_BROWSER, openImport } from "./support/app";
import { openApp } from "./support/browser";
import { generatedClip } from "./support/clip";
import type { TestFile } from "./support/media";

test.use(GERMAN_BROWSER);

const CLIP_SECONDS = 4;
const TONE_SECONDS = 2;
const CLIP_COLOUR = "#4db6ac";
const SILENT_CLIP_SECONDS = 2;
const SILENT_CLIP_COLOUR = "#9575cd";
/**
 * A loud bar's view-box height is near 100 (`VIEW_HEIGHT`); a silent one floors at 1.5
 * (`MIN_BAR_HEIGHT`). A margin well below the loud share and well above the silent floor tells
 * the tone's half from the silent one without depending on the exact peak-detection numbers.
 */
const CLEARLY_TALLER_MARGIN = 20;

/** The track inside the clip editor's excerpt strip. */
function excerptTrack(page: Page): Locator {
  return page.locator('[aria-label="Ausschnitt wählen"] .track');
}

/** Each wave bar's drawn height (the SVG's own view-box units) and whether it is "inside". */
function waveformBars(track: Locator): Promise<{ height: number; inside: boolean }[]> {
  return track.locator("svg.bars rect").evaluateAll((rects) =>
    rects.map((rect) => ({
      height: Number(rect.getAttribute("height")),
      inside: rect.classList.contains("inside"),
    })),
  );
}

/** The mean height of `bars`, which must not be empty. */
function meanHeight(bars: readonly { height: number }[]): number {
  return bars.reduce((sum, bar) => sum + bar.height, 0) / bars.length;
}

/**
 * Imports one video clip without music and opens its one slide's clip editor; `beforeOpening`
 * runs between the two, once the slideshow is stored.
 */
async function openClipEditor(
  page: Page,
  clip: TestFile,
  beforeOpening: () => Promise<void> = async () => {},
): Promise<void> {
  await openImport(page);
  await chooseFiles(page, page.getByRole("button", { name: "Bilder auswählen" }), [clip]);
  await expect(page.getByText("1 Bilder", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expectSlideshowScreen(page);
  await beforeOpening();

  const tile = page
    .getByRole("listitem")
    .filter({ has: page.getByText(/^Video, /) })
    .getByRole("button", { name: /^Bild 1, aufgenommen am/ });
  await tile.click();
  await page
    .getByRole("toolbar", { name: "Auswahl" })
    .getByRole("button", { name: "Bearbeiten" })
    .click();
  await expect(page.getByText("Clip 1", { exact: true })).toBeVisible();
}

test("E2E-064 the clip editor's strip shows the clip's sound as bars, faint with the sound off, and a note for a clip without sound", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Only Chromium's test build encodes the H.264 video and Opus sound the case imports",
  );
  await openApp(page);
  const clip = await generatedClip(page, "clip.mp4", CLIP_COLOUR, CLIP_SECONDS, {
    toneSeconds: TONE_SECONDS,
  });
  await openClipEditor(page, clip);

  const track = excerptTrack(page);
  // The excerpt starts as the whole clip, so every bar is inside it from the start.
  await expect(track.locator("svg.bars rect.inside").first()).toBeAttached();

  // The sound is read left to right; once it is, the tone's half towers over the silent one.
  await expect
    .poll(async () => {
      const bars = await waveformBars(track);
      const half = Math.floor(bars.length / 2);
      return meanHeight(bars.slice(0, half)) - meanHeight(bars.slice(half));
    })
    .toBeGreaterThan(CLEARLY_TALLER_MARGIN);

  // Sound off keeps the bars but drops the "inside" style from every one of them.
  await page.getByRole("radio", { name: "Aus" }).click();
  await expect(track.locator("svg.bars rect").first()).toBeAttached();
  await expect.poll(async () => (await waveformBars(track)).some((bar) => bar.inside)).toBe(false);

  await page.getByRole("button", { name: "Fertig", exact: true }).click();
  await page.getByRole("button", { name: "Zurück", exact: true }).click();

  const silentClip = await generatedClip(
    page,
    "silent-clip.mp4",
    SILENT_CLIP_COLOUR,
    SILENT_CLIP_SECONDS,
  );
  await openClipEditor(page, silentClip);
  await expect(excerptTrack(page).getByText("Kein Ton in diesem Clip")).toBeVisible();
});

test("E2E-065 the clip editor's strip says so, instead of drawing a flat line, when the clip's sound cannot be read", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Only Chromium's test build encodes the H.264 video and Opus sound the case imports",
  );
  await openApp(page);
  const clip = await generatedClip(page, "clip.mp4", CLIP_COLOUR, CLIP_SECONDS, {
    toneSeconds: TONE_SECONDS,
  });
  // A page that is not a secure context, e.g. plain http on a LAN address, has no AudioDecoder.
  await openClipEditor(page, clip, () =>
    page.evaluate(() => {
      delete (globalThis as { AudioDecoder?: unknown }).AudioDecoder;
    }),
  );

  const track = excerptTrack(page);
  await expect(track.getByText("Ton kann hier nicht gelesen werden")).toBeVisible();
  await expect(track.locator("svg.bars")).toHaveCount(0);
});
