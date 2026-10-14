import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  CREATED_TOAST,
  choosePictures,
  editPicture,
  editsStored,
  GERMAN_BROWSER,
  leaveEditor,
  openImport,
} from "./support/app";
import { openApp } from "./support/browser";
import { framePixels, keepDrawnFrames, meanColour, type FramePoint } from "./support/drawn-frame";
import { LANDSCAPE_PICTURE, PORTRAIT_PICTURE, pictureTakenOn } from "./support/media";

test.use(GERMAN_BROWSER);

const TITLE = "Juli 2025";
const RED = "#e53935";
const BLUE = "#1e88e5";
/**
 * No two pictures share a size: the pictures of the pair load at the same time, and the test
 * WebKit hands a worker's concurrent decodes of equally sized pictures each other's bitmaps.
 */
const PORTRAIT_PICTURE_TALLER = { ...PORTRAIT_PICTURE, height: PORTRAIT_PICTURE.height + 4 };
const LANDSCAPE_PICTURE_WIDER = { ...LANDSCAPE_PICTURE, width: LANDSCAPE_PICTURE.width + 4 };
/** Landscape, portrait, portrait, landscape: the two portrait pictures in the middle pair up. */
const PICTURES = [
  { day: "2025-07-12", colour: "#ffd54f", size: LANDSCAPE_PICTURE },
  { day: "2025-07-14", colour: RED, size: PORTRAIT_PICTURE },
  { day: "2025-07-16", colour: BLUE, size: PORTRAIT_PICTURE_TALLER },
  { day: "2025-07-20", colour: "#43a047", size: LANDSCAPE_PICTURE_WIDER },
] as const;
/** Inside the pair's slide: 5 s pictures, so the pair runs from 5 s for 1.5 × 5 s. */
const PAIR_SECONDS = 9;
/** The middle of the left and of the right half of a landscape screen. */
const LEFT_HALF: FramePoint = { x: 0.25, y: 0.5 };
const RIGHT_HALF: FramePoint = { x: 0.75, y: 0.5 };
/** How far one channel must lead the other for a sample to count as that colour. */
const DOMINANCE = 100;

const SECOND_TILE = "Bild 2, aufgenommen am 14.07.2025";
const PAIRED_SECOND_TILE = `${SECOND_TILE}, gezeigt als Paar mit Bild 3`;
const ALONE_SECOND_TILE = `${SECOND_TILE}, allein gezeigt, über einer unscharfen Füllung`;

/** "red" or "blue" when that channel clearly leads in the frame around `point`, else "other". */
async function colourAt(page: Page, player: Locator, point: FramePoint): Promise<string> {
  const [red, , blue] = meanColour(await framePixels(page, player, point));
  if (red - blue > DOMINANCE) return "red";
  if (blue - red > DOMINANCE) return "blue";
  return "other";
}

function portraitRow(page: Page, value: string): Locator {
  return page.getByRole("button", { name: `Hochformatbilder ${value} Ändern`, exact: true });
}

test("E2E-045 two portrait pictures in a row share a slide; a picture's “always alone” switch and the info panel's setting split them, stored", async ({
  page,
}) => {
  await keepDrawnFrames(page);
  await openApp(page);
  const files = await Promise.all(
    PICTURES.map(({ day, colour, size }, index) =>
      pictureTakenOn(page, `picture-${index + 1}.jpg`, day, colour, size),
    ),
  );
  await openImport(page);
  await choosePictures(page, files, PICTURES.length);
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);

  await expect(portraitRow(page, "Automatisch · 1 Paar")).toBeVisible();
  await expect(page.getByRole("button", { name: PAIRED_SECOND_TILE, exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Bild 3, aufgenommen am 16.07.2025, gezeigt als Paar mit Bild 2",
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Abspielen" }).last().click();
  const player = page.getByRole("dialog", { name: TITLE });
  await expect(player.getByText("1 / 3", { exact: true })).toBeVisible();
  const playPause = player.getByRole("button", { name: /^(Pause|Abspielen)$/ });
  await expect(playPause).toHaveAccessibleName("Pause");
  await page.keyboard.press("Space");
  await expect(playPause).toHaveAccessibleName("Abspielen");
  await player.getByRole("slider", { name: "Position in der Diashow" }).fill(String(PAIR_SECONDS));
  await expect(player.getByText("2 / 3", { exact: true })).toBeVisible();
  await expect.poll(() => colourAt(page, player, LEFT_HALF)).toBe("red");
  await expect.poll(() => colourAt(page, player, RIGHT_HALF)).toBe("blue");
  await page.keyboard.press("Escape");
  await expect(player).toBeHidden();

  await editPicture(page, PAIRED_SECOND_TILE);
  const alone = page.getByRole("switch", { name: "Immer allein" });
  await expect(alone).not.toBeChecked();
  // The switch's input is drawn over by its track; a person taps its visible name.
  await page.getByText("Immer allein", { exact: true }).click();
  await expect(alone).toBeChecked();
  await editsStored(page);
  await leaveEditor(page);
  const unpaired = async (): Promise<void> => {
    await expect(portraitRow(page, "Automatisch")).toBeVisible();
    await expect(page.getByRole("button", { name: ALONE_SECOND_TILE, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /gezeigt als Paar/ })).toHaveCount(0);
  };
  await unpaired();
  await page.reload();
  await unpaired();

  await portraitRow(page, "Automatisch").click();
  const sheet = page.getByRole("dialog", { name: "Hochformatbilder" });
  const fillScreen = sheet.getByRole("radio", { name: /^Bildschirm füllen/ });
  await fillScreen.click();
  await expect(fillScreen).toHaveAttribute("aria-checked", "true");
  await editsStored(page);
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(sheet).toBeHidden();
  await expect(portraitRow(page, "Bildschirm füllen")).toBeVisible();
  await page.reload();
  await expect(portraitRow(page, "Bildschirm füllen")).toBeVisible();
});
