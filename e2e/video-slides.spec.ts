import { expect, test } from "@playwright/test";
import { chooseFiles, GERMAN_BROWSER, openImport } from "./support/app";
import { openApp } from "./support/browser";
import { framePixels, keepDrawnFrames, meanColour } from "./support/drawn-frame";
import { generatedClip } from "./support/clip";

test.use(GERMAN_BROWSER);

const CLIP_SECONDS = 3;
const CLIP_COLOUR = "#4db6ac";
const CLIP_RGB = [0x4d, 0xb6, 0xac] as const;
const CENTRE = { x: 0.5, y: 0.5 } as const;
/** The clip's lossy video codec shifts a flat colour by a few levels. */
const COLOUR_TOLERANCE = 24;

function distance(a: readonly number[], b: readonly number[]): number {
  return Math.max(...a.map((value, channel) => Math.abs(value - (b[channel] ?? 0))));
}

test("E2E-059 a clip imported as a slide shows its length, opens in the clip editor and plays with the show", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Only Chromium's test build encodes the H.264 clip the case imports",
  );
  await keepDrawnFrames(page);
  await openApp(page);
  const clip = await generatedClip(page, "clip.mp4", CLIP_COLOUR, CLIP_SECONDS);

  await openImport(page);
  await chooseFiles(page, page.getByRole("button", { name: "Bilder auswählen" }), [clip]);
  await expect(page.getByText("1 Bilder", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText("Diashow erstellt — tippe auf Abspielen");

  await expect(page.getByText("Video, 0:03")).toBeAttached();

  const tile = page
    .getByRole("listitem")
    .filter({ has: page.getByText("Video, 0:03") })
    .getByRole("button", { name: /^Bild 1, aufgenommen am/ });
  await tile.click();
  await expect(tile).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("toolbar", { name: "Auswahl" })
    .getByRole("button", { name: "Bearbeiten" })
    .click();
  await expect(page.getByText("Clip 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Im Film: 3,0 s")).toBeVisible();
  await page.getByRole("button", { name: "Fertig", exact: true }).click();
  await expect(page.getByText("Clip 1", { exact: true })).toBeHidden();

  await page.getByRole("button", { name: "Abspielen" }).last().click();
  const player = page.getByRole("dialog");
  await expect(player.getByText("1 / 1", { exact: true })).toBeVisible();
  // The clip's colour is on the frame, and the show then runs its length out to the end card.
  await expect
    .poll(async () => distance(meanColour(await framePixels(page, player, CENTRE)), CLIP_RGB))
    .toBeLessThan(COLOUR_TOLERANCE);
  await expect(player.getByRole("heading", { name: "Ende" })).toBeVisible();
});
