import { expect, test, type Locator, type Page } from "@playwright/test";
import { exportSlideshow } from "../src/glissando-file/export-slideshow";
import type { StoredSlideshow } from "../src/library/stored-slideshow";
import { MemoryLibraryStore } from "../src/library/testing/memory-store";
import { chooseFiles, GERMAN_BROWSER, openImport } from "./support/app";
import { openApp } from "./support/browser";
import { framePixels, keepDrawnFrames, meanColour } from "./support/drawn-frame";
import { blobFile, horizontalGradientJpeg, type TestFile } from "./support/media";

test.use(GERMAN_BROWSER);

const TITLE = "Am Rand";
const PICTURE = { width: 1600, height: 800 } as const;
const SECONDS_PER_PICTURE = 12;
/**
 * Times through the slide, seeked in an order that jumps far each time, so every one shows a
 * part of the picture clearly apart from the one shown before.
 */
const SEEK_SECONDS = [11, 1, 8.5, 3.5, 6] as const;
/** The least brightness step between neighbouring samples that counts as the pan moving on. */
const MIN_STEP = 4;
const FRAME_CENTRE = { x: 0.5, y: 0.5 } as const;

/**
 * One wide picture whose own motion starts against its right edge, zoomed out, and ends zoomed
 * far in towards its left: the start frame reaches past the edge, so the edge holds it. Clamping
 * the frames on the way instead would push the view right while the zoom narrows it, then swing
 * it back left — a pan that reverses.
 */
const AGAINST_THE_EDGE: StoredSlideshow = {
  id: "edge-show",
  title: TITLE,
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: "edge-picture",
      capturedAt: "2025-09-30T10:00:00Z",
      ...PICTURE,
      fileName: "gradient.jpg",
      kenBurns: {
        from: { zoom: 1, centerX: 1, centerY: 0.5 },
        to: { zoom: 3, centerX: 0.2, centerY: 0.5 },
      },
    },
  ],
  transition: "crossfade",
  songs: [],
  secondsPerPicture: SECONDS_PER_PICTURE,
};

async function edgeSlideshowFile(page: Page): Promise<TestFile> {
  const jpeg = await horizontalGradientJpeg(page, PICTURE.width, PICTURE.height);
  const picture = new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" });
  const store = new MemoryLibraryStore();
  await store.putPicture("edge-picture", { display: picture, thumbnail: picture });
  const file = await exportSlideshow(AGAINST_THE_EDGE, store, { modifiedAt: new Date(0) });
  return blobFile(`${TITLE}.glissando`, file);
}

/**
 * The brightness (0–255) at the centre of the player's last frame. On the black-to-white
 * picture it says which point across the picture the player's view is centred on.
 */
async function brightnessAtCentre(page: Page, player: Locator): Promise<number> {
  const [red, green, blue] = meanColour(await framePixels(page, player, FRAME_CENTRE));
  return (red + green + blue) / 3;
}

test("E2E-031 a Ken Burns motion that starts against the picture's edge pans one way all through the slide", async ({
  page,
}) => {
  const glissando = await edgeSlideshowFile(page);
  await keepDrawnFrames(page);
  await openApp(page);
  await openImport(page);
  await chooseFiles(page, page.getByRole("button", { name: "Datei öffnen" }), [glissando]);
  await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();

  await page.getByRole("button", { name: "Abspielen" }).last().click();
  const player = page.getByRole("dialog", { name: TITLE });
  const playPause = player.getByRole("button", { name: /^(Pause|Abspielen)$/ });
  await expect(playPause).toHaveAccessibleName("Pause");
  await page.keyboard.press("Space");
  await expect(playPause).toHaveAccessibleName("Abspielen");

  // Seeking while paused draws exactly that moment, and nothing else draws: the centre changes
  // once it is drawn.
  const seek = player.getByRole("slider", { name: "Position in der Diashow" });
  let shown = await brightnessAtCentre(page, player);
  const brightnessAt = new Map<number, number>();
  for (const seconds of SEEK_SECONDS) {
    const before = shown;
    await seek.fill(String(seconds));
    await expect
      .poll(async () => {
        shown = await brightnessAtCentre(page, player);
        return Math.abs(shown - before);
      })
      .toBeGreaterThanOrEqual(MIN_STEP);
    brightnessAt.set(seconds, shown);
  }

  // The view's centre runs left, towards black, at every step: it never turns back.
  const inTimeOrder = [...SEEK_SECONDS]
    .sort((a, b) => a - b)
    .map((seconds) => brightnessAt.get(seconds) ?? Number.NaN);
  const steps = inTimeOrder.slice(1).map((brightness, at) => (inTimeOrder[at] ?? 0) - brightness);
  expect(
    steps.every((step) => step >= MIN_STEP),
    `brightness in time order: ${inTimeOrder}`,
  ).toBe(true);
});
