import { expect, test } from "@playwright/test";
import {
  choosePictures,
  createSlideshow,
  editPicture,
  GERMAN_BROWSER,
  openImport,
  picturesTakenOn,
} from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

test("E2E-008 a created slideshow stays in the library after a reload", async ({ page }) => {
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14"], 2);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Juli 2025" })).toBeVisible();
  await page.getByRole("button", { name: "Zurück" }).click();

  await expect(page.getByRole("heading", { name: "Deine Diashows" })).toBeVisible();
  await page.getByRole("button", { name: /Juli 2025/ }).click();

  await expect(page.getByRole("heading", { name: "Juli 2025" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Bild 1, aufgenommen am 12.07.2025" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Bild 2, aufgenommen am 14.07.2025" })).toBeVisible();
});

test("E2E-097 the Bibliothek crumb takes the picture editor back to the library", async ({
  page,
}) => {
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14"], 2);
  await editPicture(page, "Bild 1, aufgenommen am 12.07.2025");

  await page.getByRole("button", { name: "Bibliothek" }).click();

  await expect(page.getByRole("heading", { name: "Deine Diashows" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Juli 2025" })).toBeHidden();
});

test("E2E-109 a second slideshow from the same month gets its day range as a title, which the Title field can replace", async ({
  page,
}) => {
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14"]);
  await page.getByRole("button", { name: "Bibliothek" }).click();

  await openImport(page);
  await choosePictures(page, await picturesTakenOn(page, ["2025-07-20", "2025-07-22"]), 2);
  await page.getByRole("button", { name: "Weiter" }).click();
  const title = page.getByRole("textbox", { name: "Titel" });
  await expect(title).toHaveValue("20.–22. Juli 2025");
  await title.fill("Sommerfest");
  await title.press("Enter");

  await expect(page.getByRole("heading", { name: "Sommerfest" })).toBeVisible();
  await page.getByRole("button", { name: "Bibliothek" }).click();
  const july = page.getByRole("button", { name: /Juli 2025/ });
  const summer = page.getByRole("button", { name: /Sommerfest/ });
  await expect(july).toContainText(/Erstellt am \d{1,2}\. /);
  await expect(summer).toContainText(/Erstellt am \d{1,2}\. /);
});
