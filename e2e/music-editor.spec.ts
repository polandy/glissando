import { expect, test, type Page } from "@playwright/test";
import {
  CREATED_TOAST,
  chooseFiles,
  choosePictures,
  editsStored,
  GERMAN_BROWSER,
  openImport,
  picturesTakenOn,
} from "./support/app";
import { openApp } from "./support/browser";
import { silentTrack } from "./support/media";

test.use(GERMAN_BROWSER);

const TRACK_SECONDS = 20;

/** Imports three pictures with a silent track and waits on the created slideshow's screen. */
async function createSlideshowWithMusic(page: Page): Promise<void> {
  await openImport(page);
  await choosePictures(
    page,
    await picturesTakenOn(page, ["2025-07-12", "2025-07-14", "2025-07-20"]),
    3,
  );
  await page.getByRole("button", { name: "Weiter" }).click();
  await chooseFiles(page, page.getByRole("button", { name: "Musik auswählen" }), [
    silentTrack("Sommerwind.wav", TRACK_SECONDS),
  ]);
  await expect(page.getByText("Sommerwind.wav", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Diashow erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);
}

test("E2E-023 the music gets its own excerpt and fade-in, stored, summed up in the music row, and goes back to the whole track", async ({
  page,
}) => {
  const excerpt = page.locator('section[aria-labelledby="music-excerpt"]');
  const excerptState = excerpt.locator(".state");
  const startValue = excerpt.locator("output.mono").first();
  const endValue = excerpt.locator("output.mono").last();
  const startLater = excerpt.getByRole("button", { name: "Anfang eine halbe Sekunde später" });
  const endHandle = page.getByRole("slider", { name: "Ende" });
  const fadeIn = page.locator('section[aria-labelledby="music-fade-in"]');
  const fadeOut = page.locator('section[aria-labelledby="music-fade-out"]');
  const longFadeIn = fadeIn.getByRole("radio", { name: /^Lang/ });
  const back = page.getByRole("button", { name: "Zurück", exact: true });
  await openApp(page);
  await createSlideshowWithMusic(page);

  await page.getByRole("button", { name: "Musik Sommerwind.wav ganzer Titel Bearbeiten" }).click();
  await expect(
    page.getByRole("navigation", { name: "Navigationspfad" }).locator('[aria-current="page"]'),
  ).toHaveText("Musik");
  await expect(excerptState).toHaveText("Ganzer Titel");
  await expect(excerpt.getByText("Die Diashow nutzt den ganzen Titel, 0:20.")).toBeVisible();
  await expect(fadeIn.locator(".state")).toHaveText("Automatisch");

  await startLater.click();
  await expect(startValue).toHaveText("0:00,5");
  await startLater.click();
  await expect(startValue).toHaveText("0:01,0");
  await expect(excerptState).toHaveText("Gekürzt");

  // The handle steps a second per Shift+arrow, as a slider does.
  await endHandle.focus();
  await endHandle.press("Shift+ArrowLeft");
  await expect(endHandle).toHaveAttribute("aria-valuenow", "19000");
  await endHandle.press("Shift+ArrowLeft");
  await expect(endHandle).toHaveAttribute("aria-valuenow", "18000");
  await endHandle.press("Shift+ArrowLeft");
  await expect(endHandle).toHaveAttribute("aria-valuenow", "17000");
  await expect(endValue).toHaveText("0:17,0");
  await expect(page.getByText("0:20 · gekürzt auf 0:16")).toBeVisible();

  await longFadeIn.click();
  await expect(longFadeIn).toHaveAttribute("aria-checked", "true");
  await expect(fadeIn.locator(".state")).toHaveText("Eigene");
  await expect(fadeOut.locator(".state")).toHaveText("Automatisch");
  await expect(
    fadeOut.getByText("Automatisch: kurz, weil der Ausschnitt vor dem Titelende aufhört."),
  ).toBeVisible();
  await editsStored(page);

  await page.reload();
  await expect(excerptState).toHaveText("Gekürzt");
  await expect(startValue).toHaveText("0:01,0");
  await expect(endValue).toHaveText("0:17,0");
  await expect(longFadeIn).toHaveAttribute("aria-checked", "true");
  await expect(fadeIn.locator(".state")).toHaveText("Eigene");

  await back.click();
  const trimmedRow = page.getByRole("button", {
    name: "Musik Sommerwind.wav 0:01–0:17 · blendet ein und aus Bearbeiten",
  });
  await expect(trimmedRow).toBeVisible();

  await trimmedRow.click();
  await expect(excerptState).toHaveText("Gekürzt");
  await excerpt.getByRole("button", { name: "Ganzer Titel" }).click();
  await expect(excerptState).toHaveText("Ganzer Titel");
  await expect(startValue).toHaveText("0:00,0");
  await expect(endValue).toHaveText("0:20,0");
  await expect(fadeIn.locator(".state")).toHaveText("Eigene");
  await editsStored(page);

  await back.click();
  await expect(
    page.getByRole("button", { name: "Musik Sommerwind.wav blendet ein Bearbeiten" }),
  ).toBeVisible();
});
