import { expect, test } from "@playwright/test";
import {
  CREATED_TOAST,
  chooseFiles,
  choosePictures,
  definitionOf,
  GERMAN_BROWSER,
  openImport,
  picturesTakenOn,
} from "./support/app";
import { openApp } from "./support/browser";
import { silentTrack, textFile } from "./support/media";

test.use(GERMAN_BROWSER);

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("E2E-005 importing pictures and music creates a slideshow ordered by capture date", async ({
  page,
}) => {
  await openImport(page);
  const next = page.getByRole("button", { name: "Weiter" });
  await expect(page.getByRole("heading", { name: "Welche Bilder?" })).toBeVisible();
  await expect(next).toBeDisabled();

  const [late, early, middle] = await picturesTakenOn(page, [
    "2025-07-20",
    "2025-07-12",
    "2025-07-14",
  ]);
  if (late === undefined || early === undefined || middle === undefined) {
    throw new Error("expected three test pictures");
  }
  await choosePictures(page, [late, textFile("notes.txt"), early, middle], 3);

  await expect(page.getByText("· 12.07.2025 bis 20.07.2025")).toBeVisible();
  await expect(
    page.getByText("1 Datei konnte nicht als Bild gelesen werden und wurde übersprungen:"),
  ).toBeVisible();
  await expect(page.getByText(/notes\.txt\./)).toBeVisible();
  await expect(page.getByRole("listitem").locator(".date")).toHaveText([
    "12.07.2025",
    "14.07.2025",
    "20.07.2025",
  ]);
  await expect(next).toBeEnabled();

  await next.click();
  await expect(page.getByRole("heading", { name: "Welche Musik?" })).toBeVisible();
  // Every new slideshow starts on Calm (ADR-0050), so the pace line names it and its own 7 s.
  await expect(page.locator(".pace")).toHaveText(
    "Stimmung Ruhig · etwa 7 s je Bild. Ändern lässt sie sich in der Diashow.",
  );
  await expect(definitionOf(page, "Bilder")).toHaveText("3");
  await expect(definitionOf(page, "je Bild")).toHaveText("7 s");
  await expect(definitionOf(page, "Gesamt")).toHaveText("0:21");

  await chooseFiles(page, page.getByRole("button", { name: "Dateien wählen" }), [
    silentTrack("Sommerwind.wav", 9),
  ]);
  await expect(page.getByText("Sommerwind.wav", { exact: true })).toBeVisible();
  await expect(page.getByText("0:09 · WAV")).toBeVisible();
  // The 9 s song is too short to shrink the pictures down to (ADR-0047's floor keeps each one at
  // least ⅔ of Calm's 7 s), so they keep their own pace and the music just ends before they do.
  await expect(page.locator(".pace")).toHaveText(
    "Stimmung Ruhig · etwa 7 s je Bild, auf den Phrasen der Musik. Ändern lässt sie sich in der Diashow.",
  );
  await expect(definitionOf(page, "je Bild")).toHaveText("7 s");
  await expect(definitionOf(page, "Gesamt")).toHaveText("0:21");

  await page.getByRole("button", { name: "Diashow erstellen" }).click();

  await expect(page.getByRole("heading", { name: "Juli 2025" })).toBeVisible();
  await expect(page.getByText("12.07.2025 – 20.07.2025")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Musik Sommerwind\.wav/ })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);
});

test.describe("Abbrechen with pictures chosen", () => {
  test.beforeEach(async ({ page }) => {
    await openImport(page);
    await choosePictures(page, await picturesTakenOn(page, ["2025-07-12", "2025-07-14"]), 2);
    await page.getByRole("button", { name: "Abbrechen" }).click();
    await expect(page.getByRole("dialog", { name: "Auswahl verwerfen?" })).toBeVisible();
  });

  test("E2E-006 Weiter auswählen keeps the chosen pictures", async ({ page }) => {
    await page.getByRole("button", { name: "Weiter auswählen" }).click();

    await expect(page.getByRole("dialog", { name: "Auswahl verwerfen?" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "Welche Bilder?" })).toBeVisible();
    await expect(page.getByRole("listitem").locator(".date")).toHaveText([
      "12.07.2025",
      "14.07.2025",
    ]);
  });

  test("E2E-007 Verwerfen returns to start and stores nothing", async ({ page }) => {
    await page.getByRole("button", { name: "Verwerfen" }).click();
    await expect(page.getByRole("heading", { name: "Bilder rein, Diashow raus." })).toBeVisible();

    await page.reload();

    await expect(page.getByRole("heading", { name: "Bilder rein, Diashow raus." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Deine Diashows" })).toBeHidden();
  });
});

test.describe("Removing chosen pictures", () => {
  test.beforeEach(async ({ page }) => {
    await openImport(page);
    await choosePictures(
      page,
      await picturesTakenOn(page, ["2025-07-12", "2025-07-13", "2025-07-14"]),
      3,
    );
  });

  test("E2E-037 a removed picture stays out of the created slideshow, and Undo puts removals back", async ({
    page,
  }) => {
    const tiles = page.getByRole("listitem").locator(".date");
    // Tile 2 (13.07.2025): removing it leaves 12.07.2025 and 14.07.2025, the latter now tile 2.
    await page.getByRole("button", { name: "Bild 2 entfernen" }).click();
    await expect(page.getByRole("status")).toContainText("Bild entfernt");
    await expect(page.getByText("2 Bilder", { exact: true })).toBeVisible();

    // Delete/Backspace remove the focused tile itself (its keydown sits on the tile, not the mark).
    await page.getByRole("button", { name: "Bild 2, aufgenommen am 14.07.2025" }).press("Delete");
    await expect(page.getByRole("status")).toContainText("2 Bilder entfernt");
    await expect(tiles).toHaveText(["12.07.2025"]);
    await page.getByRole("status").getByRole("button", { name: "Rückgängig" }).click();
    await expect(tiles).toHaveText(["12.07.2025", "13.07.2025", "14.07.2025"]);

    await page.getByRole("button", { name: "Bild 1 entfernen" }).click();
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();

    await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);
    await expect(page.getByText("13.07.2025 – 14.07.2025")).toBeVisible();
  });
});
