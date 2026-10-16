import { expect, test } from "@playwright/test";
import {
  choosePictures,
  CREATED_TOAST,
  editPicture,
  GERMAN_BROWSER,
  leaveEditor,
  openImport,
} from "./support/app";
import { openApp } from "./support/browser";
import { portraitTakenOn, stripedPictureTakenOn } from "./support/media";

test.use(GERMAN_BROWSER);

test("E2E-028 the automatic motion's focus is found in the background: a face is marked in the picture editor until an own motion replaces it, a faceless picture says so, and the library card ends without a search line", async ({
  page,
}) => {
  const picture = page.locator(".pic");
  const marker = page.getByRole("img", { name: "Fokus: Gesicht erkannt" });
  const noSubject = page.getByText("Kein Motiv erkannt – die Bewegung bleibt mittig.");
  const state = page.locator(".motion .state");
  const frames = page.getByRole("group", { name: "Rahmen" });
  const kenBurns = page.getByRole("region", { name: "Ken Burns" });
  await openApp(page);
  await openImport(page);
  await choosePictures(
    page,
    [
      portraitTakenOn("portrait.jpg", "2025-07-12"),
      await stripedPictureTakenOn(page, "stripes.jpg", "2025-07-14", "#4db6ac"),
    ],
    2,
  );
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);

  await editPicture(page, "Bild 1, aufgenommen am 12.07.2025, über einer unscharfen Füllung");
  await expect(picture).toBeVisible();
  await expect(state).toHaveText("Automatisch");
  // The background focus pass detects pictures one at a time; no fixed bound on how long
  // picture 1's turn in the queue takes under load, so wait for it rather than guess.
  await expect(marker).toBeVisible({ timeout: 0 });
  await expect(marker).toContainText("Fokus");

  await page.locator(".frame.active").press("+");
  await expect(state).toHaveText("Eigene Bewegung");
  await expect(frames).toBeVisible();
  await expect(marker).toBeHidden();

  await kenBurns.getByRole("button", { name: "Zurück auf automatisch" }).click();
  await expect(state).toHaveText("Automatisch");
  await expect(marker).toBeVisible();
  await leaveEditor(page);

  await editPicture(page, "Bild 2, aufgenommen am 14.07.2025");
  await expect(picture).toBeVisible();
  // Picture 2 is second in the focus pass's queue; it may still be "searching" here under load.
  await expect(noSubject).toBeVisible({ timeout: 0 });
  await expect(marker).toBeHidden();

  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  const card = page.getByRole("button", { name: /Juli 2025/ });
  await expect(card).toContainText("2 Bilder");
  await expect(card.getByRole("progressbar", { name: "Motive werden gesucht" })).toHaveCount(0);
  await expect(card).not.toContainText("Motive werden gesucht");
});
