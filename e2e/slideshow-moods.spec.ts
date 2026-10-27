import { expect, test } from "@playwright/test";
import { createSlideshowWithMusic, definitionOf, editsStored, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { clickTrackWav } from "./support/media";

test.use(GERMAN_BROWSER);

const TRACK_BPM = 120;

test("E2E-079 picking Calm sets its transitions, Ken Burns and picture times, and leaving it by another transition keeps an undo", async ({
  page,
}) => {
  const moodRow = page.getByRole("button", { name: /^Stimmung Eigene/ });
  const calmRow = page.getByRole("button", { name: /^Stimmung Ruhig/ });
  const transitionsRow = page.getByRole("button", {
    name: "Übergänge Überblenden, lang nach Stimmung",
  });
  const sheet = page.getByRole("dialog", { name: "Stimmung" });
  const customTile = sheet.getByRole("radio", { name: "Eigene" });
  const calmTile = sheet.getByRole("radio", { name: "Ruhig" });
  const badge = sheet.locator(".badge");
  const statePill = sheet.locator(".state");

  await openApp(page);
  await createSlideshowWithMusic(page, clickTrackWav("Takt.wav", 20, TRACK_BPM));
  await expect(moodRow).toBeVisible();
  // The Transitions row lives behind the Fine settings fold (ADR-0048).
  await page.getByRole("button", { name: "Feineinstellungen" }).click();

  await moodRow.click();
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("radio")).toHaveCount(3);
  await expect(customTile).toHaveAttribute("aria-checked", "true");
  await expect(badge).toHaveText(`♪ ${TRACK_BPM} BPM · Eigene`);

  await calmTile.click();
  await expect(calmTile).toHaveAttribute("aria-checked", "true");
  await expect(statePill).toHaveText("Ruhig");
  await expect(badge).toHaveText(`♪ ${TRACK_BPM} BPM · Ruhig`);
  await expect(definitionOf(sheet, "Übergänge")).toHaveText("Überblenden, lang");
  await expect(definitionOf(sheet, "Ken Burns")).toHaveText("Sanft");
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(sheet).toBeHidden();

  await expect(calmRow).toBeVisible();
  await expect(transitionsRow).toBeVisible();

  await transitionsRow.click();
  const transitionsSheet = page.getByRole("dialog", { name: "Übergänge der Diashow" });
  const pushTile = transitionsSheet.getByRole("radio", { name: "Schieben" });
  await expect(transitionsSheet).toBeVisible();
  await pushTile.click();
  await expect(pushTile).toHaveAttribute("aria-checked", "true");
  await transitionsSheet.getByRole("button", { name: "Fertig" }).click();
  await expect(transitionsSheet).toBeHidden();

  const toast = page.getByRole("status").filter({ hasText: "Stimmung ist jetzt Eigene" });
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Rückgängig" }).click();
  await expect(calmRow).toBeVisible();
  await editsStored(page);

  await page.reload();
  await expect(calmRow).toBeVisible();
});
