import { expect, test, type Page } from "@playwright/test";
import {
  chooseFiles,
  CREATED_TOAST,
  definitionOf,
  GERMAN_BROWSER,
  openImport,
} from "./support/app";
import { openApp } from "./support/browser";
import { pictureTakenOn, sceneTakenAt, stripedPictureTakenOn } from "./support/media";

test.use(GERMAN_BROWSER);

/** A slideshow tile's accessible name on the created slideshow's screen. */
const SLIDESHOW_TILE = /^Bild \d+, aufgenommen am \d{2}\.\d{2}\.\d{4}$/;

/** The wizard strip's pictures, named by their remove buttons in strip order. */
function stripRemoveButtons(page: Page) {
  return page.getByRole("button", { name: /^Bild \d+ entfernen$/ });
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("E2E-042 the import sets aside the blurrier of two similar shots and a blurry picture, + takes one in, and the slideshow holds the kept and taken-in ones", async ({
  page,
}) => {
  const files = [
    await stripedPictureTakenOn(page, "harbour.jpg", "2025-07-12", "#2e7d32"),
    await sceneTakenAt(page, "pier-first.jpg", "2025-07-13", "12:00:00", "#7986cb"),
    await sceneTakenAt(page, "pier-second.jpg", "2025-07-13", "12:01:30", "#1a237e"),
    await pictureTakenOn(page, "shaky.jpg", "2025-07-14", "#ffd54f"),
  ];

  await openImport(page);
  await chooseFiles(page, page.getByRole("button", { name: "Medien auswählen" }), files);

  const setAside = page.getByRole("region", { name: /^Beiseitegelegt/ });
  await expect(setAside.getByRole("heading", { level: 2 })).toHaveText("Beiseitegelegt · 2");
  await expect(stripRemoveButtons(page)).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Bild 1 entfernen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bild 2 entfernen" })).toBeVisible();

  await expect(setAside.getByRole("heading", { level: 3 })).toHaveText([
    "Ähnlich · 13.07.2025 12:00–12:01 · das schärfste bleibt",
    "Unscharf",
  ]);
  await expect(setAside.getByRole("listitem")).toHaveText([
    "12:01:30 Behalten",
    "12:00:00 Ähnlich",
    "12:00:00 Unscharf",
  ]);
  await expect(
    setAside.getByRole("button", { name: "Bild vom 13.07.2025 um 12:00:00 übernehmen" }),
  ).toBeVisible();

  await setAside
    .getByRole("button", { name: "Bild vom 14.07.2025 um 12:00:00 übernehmen" })
    .click();

  await expect(page.getByRole("button", { name: "Bild 3 entfernen" })).toBeVisible();
  await expect(stripRemoveButtons(page)).toHaveCount(3);
  await expect(setAside.getByRole("heading", { level: 2 })).toHaveText("Beiseitegelegt · 1");
  await expect(setAside.getByRole("heading", { level: 3 })).toHaveText([
    "Ähnlich · 13.07.2025 12:00–12:01 · das schärfste bleibt",
  ]);

  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(definitionOf(page, "Bilder")).toHaveText("3");
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();

  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);
  const slideshowTiles = page.getByRole("button", { name: SLIDESHOW_TILE });
  await expect(
    page.getByRole("button", { name: "Bild 1, aufgenommen am 12.07.2025" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bild 2, aufgenommen am 13.07.2025" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bild 3, aufgenommen am 14.07.2025" }),
  ).toBeVisible();
  await expect(slideshowTiles).toHaveCount(3);
});
