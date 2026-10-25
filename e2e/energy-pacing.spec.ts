import { expect, test } from "@playwright/test";
import { createSlideshowWithMusic, editsStored, GERMAN_BROWSER } from "./support/app";
import { clickSwitch } from "./support/switch";
import { openApp } from "./support/browser";
import { clickTrackWav } from "./support/media";

test.use(GERMAN_BROWSER);

const TRACK_BPM = 120;
const ENERGY_SWITCH = "Folgt der Energie der Musik";

test("E2E-080 the energy switch in the info panel stores at once, shows in the Mood sheet and survives a reload", async ({
  page,
}) => {
  const moodRow = page.getByRole("button", { name: "Stimmung Eigene Vorgabe Ändern" });
  const panelSwitch = page.getByRole("switch", { name: ENERGY_SWITCH });
  const sheet = page.getByRole("dialog", { name: "Stimmung" });
  const sheetSwitch = sheet.getByRole("switch", { name: ENERGY_SWITCH });

  await openApp(page);
  await createSlideshowWithMusic(page, clickTrackWav("Takt.wav", 20, TRACK_BPM));
  await expect(panelSwitch).not.toBeChecked();

  await clickSwitch(panelSwitch);
  await expect(panelSwitch).toBeChecked();
  await editsStored(page);

  await moodRow.click();
  await expect(sheetSwitch).toBeChecked();
  await clickSwitch(sheetSwitch);
  await expect(sheetSwitch).not.toBeChecked();
  await clickSwitch(sheetSwitch);
  await expect(sheetSwitch).toBeChecked();
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(sheet).toBeHidden();
  await editsStored(page);

  await page.reload();
  await expect(panelSwitch).toBeChecked();
});
