import { expect, test } from "@playwright/test";
import { createSlideshowWithMusic, editsStored, GERMAN_BROWSER } from "./support/app";
import { clickSwitch } from "./support/switch";
import { openApp } from "./support/browser";
import { clickTrackWav } from "./support/media";

test.use(GERMAN_BROWSER);

const TRACK_BPM = 120;
const ENERGY_SWITCH = "Folgt der Energie der Musik";

test("E2E-080 the Mood sheet's energy switch stores at once and survives a reload", async ({
  page,
}) => {
  // A clear tempo starts the slideshow on Calm at once (ADR-0049).
  const moodTile = page.getByRole("button", { name: /^Stimmung Ruhig/ });
  const sheet = page.getByRole("dialog", { name: "Stimmung" });
  const sheetSwitch = sheet.getByRole("switch", { name: ENERGY_SWITCH });

  await openApp(page);
  await createSlideshowWithMusic(page, clickTrackWav("Takt.wav", 20, TRACK_BPM));

  await moodTile.click();
  await expect(sheetSwitch).not.toBeChecked();

  await clickSwitch(sheetSwitch);
  await expect(sheetSwitch).toBeChecked();
  await editsStored(page);

  await clickSwitch(sheetSwitch);
  await expect(sheetSwitch).not.toBeChecked();
  await clickSwitch(sheetSwitch);
  await expect(sheetSwitch).toBeChecked();
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(sheet).toBeHidden();
  await editsStored(page);

  await page.reload();
  await moodTile.click();
  await expect(sheetSwitch).toBeChecked();
});
