import { expect, test, type Locator, type Page } from "@playwright/test";
import { chooseFiles, CREATED_TOAST, GERMAN_BROWSER, openImport } from "./support/app";
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
  await chooseFiles(page, page.getByRole("button", { name: "Medien auswählen" }), [clip]);
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

const PLAYHEAD_CLIP_SECONDS = 8;
/** Pointer travel split into steps, so a drag passes the editor's drag threshold as a hand does. */
const DRAG_STEPS = 8;

/** A point at `ms` of the whole clip on the strip's track, at its vertical centre. */
async function trackPointAt(
  track: Locator,
  ms: number,
  sourceMs: number,
): Promise<{ x: number; y: number }> {
  const box = await track.boundingBox();
  if (box === null) {
    throw new Error("the excerpt strip is not shown");
  }
  return { x: box.x + (ms / sourceMs) * box.width, y: box.y + box.height / 2 };
}

/** The centre of `target` on the page. */
async function centreOf(target: Locator): Promise<{ x: number; y: number }> {
  const box = await target.boundingBox();
  if (box === null) {
    throw new Error("the drag target is not shown");
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: DRAG_STEPS });
  await page.mouse.up();
}

test("E2E-063 the clip editor's strip shows the player's place as a draggable mark with a time chip, which a dragged handle leaves where it was", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Only Chromium's test build encodes the H.264 clip the case imports",
  );
  const sourceMs = PLAYHEAD_CLIP_SECONDS * 1000;
  await openApp(page);
  const clip = await generatedClip(page, "clip.mp4", CLIP_COLOUR, PLAYHEAD_CLIP_SECONDS);

  await openImport(page);
  await chooseFiles(page, page.getByRole("button", { name: "Medien auswählen" }), [clip]);
  await expect(page.getByText("1 Bilder", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);

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

  const track = page.locator('[aria-label="Ausschnitt wählen"] .track');
  const chip = track.locator(".chip");
  const endHandle = page.getByRole("slider", { name: "Ende" });
  const scrub = page.getByRole("slider", { name: "Position im Ausschnitt" });

  // The mark and its chip are shown at the player's place without ever pressing play.
  await expect(track.locator(".playhead")).toBeVisible();
  await expect(chip).toHaveText("0:00,0");

  // The scrub slider moves the player's place, which the strip's mark and chip follow.
  await scrub.fill("4000");
  await expect(chip).toHaveText("0:04,0");

  // Dragging the mark's own line on the strip moves the player's place the same way, and the
  // scrub slider follows it back.
  await drag(
    page,
    await centreOf(track.locator(".playhead-zone")),
    await trackPointAt(track, 6_000, sourceMs),
  );
  await expect(chip).toHaveText("0:06,0");
  await expect(scrub).toHaveValue("6000");

  // Dragging the end handle shows only its own frame; the mark and chip keep the player's own
  // place during the drag, and stay there once it is released.
  const handleCentre = await centreOf(endHandle);
  await page.mouse.move(handleCentre.x, handleCentre.y);
  await page.mouse.down();
  const { x: dragToX } = await trackPointAt(track, 7_000, sourceMs);
  await page.mouse.move(dragToX, handleCentre.y, { steps: DRAG_STEPS });
  await expect(chip).toHaveText("0:06,0");
  await page.mouse.up();
  await expect(endHandle).toHaveAttribute("aria-valuenow", "7000");
  await expect(chip).toHaveText("0:06,0");
  await expect(scrub).toHaveValue("6000");
});
