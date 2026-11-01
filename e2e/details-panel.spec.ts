import { expect, test } from "@playwright/test";
import { createSlideshowWithMusic, editsStored, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { clickTrackWav } from "./support/media";
import { clickSwitch } from "./support/switch";

test.use(GERMAN_BROWSER);

const TRACK_BPM = 120;
const ENERGY_SWITCH = "Folgt der Energie der Musik";

test("E2E-083 the slideshow's details show music, mood and look up front; fine settings fold and stay as left after a reload", async ({
  page,
}) => {
  const musicTile = page.getByRole("button", { name: /^Musik/ });
  const moodTile = page.getByRole("button", { name: /^Stimmung/ });
  const lookTile = page.getByRole("button", { name: /^Look/ });
  const fineSettings = page.getByRole("button", { name: "Weitere Einstellungen" });
  const transitionsRow = page.getByRole("button", { name: /^Übergänge/ });
  const portraitRow = page.getByRole("button", { name: /^Hochformatbilder/ });
  const chaptersSwitch = page.getByRole("switch", { name: "Reisekapitel" });
  const sheet = page.getByRole("dialog", { name: "Stimmung" });
  const sheetSwitch = sheet.getByRole("switch", { name: ENERGY_SWITCH });

  await openApp(page);
  await createSlideshowWithMusic(page, clickTrackWav("Takt.wav", 20, TRACK_BPM));

  // The three tiles are up front, never folded.
  await expect(musicTile).toBeVisible();
  await expect(moodTile).toBeVisible();
  await expect(lookTile).toBeVisible();

  // Fine settings starts folded.
  await expect(fineSettings).toHaveAttribute("aria-expanded", "false");
  await expect(transitionsRow).toBeHidden();

  // The energy switch lives only in the Mood sheet.
  await moodTile.click();
  await expect(sheetSwitch).not.toBeChecked();
  await clickSwitch(sheetSwitch);
  await expect(sheetSwitch).toBeChecked();
  await editsStored(page);
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(sheet).toBeHidden();

  // A positive signal (the tile's short phrase) before the negatives (no derived text, no switch
  // in the panel).
  await expect(moodTile).toContainText("Langsam, sanft");
  await expect(moodTile).not.toContainText("folgt der Energie");
  await expect(page.getByRole("switch", { name: ENERGY_SWITCH })).toBeHidden();

  // Opened, Fine settings shows its rows.
  await fineSettings.click();
  await expect(fineSettings).toHaveAttribute("aria-expanded", "true");
  await expect(transitionsRow).toBeVisible();
  await expect(portraitRow).toBeVisible();
  await expect(chaptersSwitch).toBeVisible();

  // The fold is remembered per device: open survives a reload.
  await page.reload();
  await expect(fineSettings).toHaveAttribute("aria-expanded", "true");
  await expect(transitionsRow).toBeVisible();

  // Closed survives a reload too.
  await fineSettings.click();
  await expect(fineSettings).toHaveAttribute("aria-expanded", "false");
  await page.reload();
  await expect(fineSettings).toHaveAttribute("aria-expanded", "false");
  await expect(transitionsRow).toBeHidden();
});
