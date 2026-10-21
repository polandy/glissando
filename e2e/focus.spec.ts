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
  await expect(marker).toContainText("Gesicht");

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

test("E2E-074 the More menu's Fokus sheet sums a face and a faceless picture into its legend once the pass is done, a legend tap dims the other, and closing hides it", async ({
  page,
}) => {
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

  await page.getByRole("button", { name: "Mehr" }).click();
  await page.getByRole("menuitem", { name: /^Fokus/ }).click();
  const sheet = page.getByRole("dialog", { name: "Fokus" });
  await expect(sheet).toBeVisible();

  // The background focus pass detects pictures one at a time; no fixed bound on how long two
  // pictures take under load, so wait for it rather than guess.
  await expect(sheet.getByText("Alle Bilder angesehen.", { exact: true })).toBeVisible({
    timeout: 0,
  });
  const faceChip = sheet.getByRole("button", { name: "Gesichter 1", exact: true });
  const noSubjectChip = sheet.getByRole("button", { name: "Nichts gefunden 1", exact: true });
  await expect(faceChip).toBeVisible();
  await expect(noSubjectChip).toBeVisible();

  const faceTile = sheet.getByRole("button", { name: "Gesichter", exact: true });
  const noSubjectTile = sheet.getByRole("button", { name: "Nichts gefunden", exact: true });
  // No filter is active yet: neither tile is dimmed, which is what the tap below changes.
  await expect(sheet.locator(".tile.dim")).toHaveCount(0);

  await faceChip.click();
  await expect(faceChip).toHaveAttribute("aria-pressed", "true");
  await expect(faceTile).not.toHaveClass(/dim/);
  await expect(noSubjectTile).toHaveClass(/dim/);

  await sheet.getByRole("button", { name: "Schließen" }).click();
  await expect(sheet).toBeHidden();
});
