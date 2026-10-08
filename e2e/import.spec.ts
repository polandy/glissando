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
  await expect(page.getByRole("listitem")).toHaveText(["12.07.2025", "14.07.2025", "20.07.2025"]);
  await expect(next).toBeEnabled();

  await next.click();
  await expect(page.getByRole("heading", { name: "Welche Musik?" })).toBeVisible();
  await expect(definitionOf(page, "Bilder")).toHaveText("3");
  await expect(definitionOf(page, "je Bild")).toHaveText("5 s");
  await expect(definitionOf(page, "Gesamt")).toHaveText("0:15");

  await page.getByRole("button", { name: "Kürzer" }).click();
  await page.getByRole("button", { name: "Kürzer" }).click();
  await expect(definitionOf(page, "je Bild")).toHaveText("4 s");
  await expect(definitionOf(page, "Gesamt")).toHaveText("0:12");

  await chooseFiles(page, page.getByRole("button", { name: "Musik auswählen" }), [
    silentTrack("Sommerwind.wav", 9),
  ]);
  await expect(page.getByText("Sommerwind.wav", { exact: true })).toBeVisible();
  await expect(page.getByText("0:09 · WAV")).toBeVisible();
  await expect(definitionOf(page, "je Bild")).toHaveText("3 s");
  await expect(definitionOf(page, "Gesamt")).toHaveText("0:09");

  await page.getByRole("button", { name: "Diashow erstellen" }).click();

  await expect(page.getByRole("heading", { name: "Juli 2025" })).toBeVisible();
  await expect(page.getByText("12.07.2025 – 20.07.2025")).toBeVisible();
  await expect(definitionOf(page, "Bilder")).toHaveText("3");
  await expect(definitionOf(page, "Musik")).toHaveText("Sommerwind.wav");
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
    await expect(page.getByRole("listitem")).toHaveText(["12.07.2025", "14.07.2025"]);
  });

  test("E2E-007 Verwerfen returns to start and stores nothing", async ({ page }) => {
    await page.getByRole("button", { name: "Verwerfen" }).click();
    await expect(page.getByRole("heading", { name: "Bilder rein, Diashow raus." })).toBeVisible();

    await page.reload();

    await expect(page.getByRole("heading", { name: "Bilder rein, Diashow raus." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Deine Diashows" })).toBeHidden();
  });
});
