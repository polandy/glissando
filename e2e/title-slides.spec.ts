import { expect, test, type Locator, type Page } from "@playwright/test";
import { createSlideshow, editsStored, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

/** The strip's title slide tile; present whether or not a title slide is stored (TITLE_SLIDES.md). */
function openingTile(page: Page): Locator {
  return page.getByRole("button", { name: "Titelbild", exact: true });
}

/** The strip's closing slide tile; present whether or not a closing slide is stored. */
function closingTile(page: Page): Locator {
  return page.getByRole("button", { name: "Schlussbild", exact: true });
}

/** The still shown on a title/closing tile once its card has a title; absent on a dashed tile. */
function cardFaceOf(tile: Locator): Locator {
  return tile.locator('[data-testid="card-face"]');
}

/** Renames the current slideshow, waiting on the stored title. */
async function renameSlideshow(page: Page, title: string): Promise<void> {
  await page.getByRole("button", { name: "Titel umbenennen" }).click();
  await page.getByRole("textbox", { name: "Titel" }).fill(title);
  await page.getByRole("textbox", { name: "Titel" }).press("Enter");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await editsStored(page);
}

test("E2E-054 the title slide's tile sits before the first picture, opens with the slideshow's title, and a style and title change persist", async ({
  page,
}) => {
  const dialog = page.getByRole("dialog");
  const titleField = page.getByRole("textbox", { name: "Titel", exact: true });
  const stylePicker = dialog.getByRole("radiogroup", { name: "Stil" });
  const classicStyle = stylePicker.getByRole("radio", { name: /Klassisch/ });
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"], 5);
  await renameSlideshow(page, "Sommer am See");

  // Absent cards: both tiles are dashed placeholders, the title slide before the first picture,
  // the closing slide after the last one.
  const strip = page.locator("ol.strip > li");
  await expect(strip.first()).toContainText("Titelbild");
  await expect(strip.last()).toContainText("Schlussbild");
  await expect(openingTile(page)).toHaveClass(/empty/);
  await expect(cardFaceOf(openingTile(page))).toHaveCount(0);
  await expect(closingTile(page)).toHaveClass(/empty/);

  await openingTile(page).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Titelbild" })).toBeVisible();
  // Defaults: the title is the slideshow's own title, shown at once in the preview.
  await expect(titleField).toHaveValue("Sommer am See");
  await expect(dialog.getByText("Sommer am See")).toBeVisible();

  await classicStyle.click();
  await expect(classicStyle).toHaveAttribute("aria-checked", "true");

  await titleField.fill("Herbstfest");
  await expect(dialog.getByText("Herbstfest")).toBeVisible();
  await expect(dialog.getByText("Sommer am See")).toHaveCount(0);
  await editsStored(page);

  await dialog.getByRole("button", { name: "Fertig" }).click();
  await expect(dialog).toBeHidden();
  await expect(cardFaceOf(openingTile(page))).toBeVisible();
  await expect(openingTile(page)).not.toHaveClass(/empty/);

  await page.reload();
  await expect(cardFaceOf(openingTile(page))).toBeVisible();
  await openingTile(page).click();
  await expect(titleField).toHaveValue("Herbstfest");
  await expect(classicStyle).toHaveAttribute("aria-checked", "true");
});

test("E2E-055 typing a title on the closing slide makes its tile show the card, and Remove turns it dashed again", async ({
  page,
}) => {
  const dialog = page.getByRole("dialog");
  const titleField = page.getByRole("textbox", { name: "Titel", exact: true });
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"], 5);

  await expect(closingTile(page)).toHaveClass(/empty/);
  await expect(cardFaceOf(closingTile(page))).toHaveCount(0);

  await closingTile(page).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Schlussbild" })).toBeVisible();
  await expect(titleField).toHaveValue("");

  await titleField.fill("Bis zum nächsten Mal");
  await expect(dialog.getByText("Bis zum nächsten Mal")).toBeVisible();
  await editsStored(page);
  await dialog.getByRole("button", { name: "Fertig" }).click();
  await expect(dialog).toBeHidden();

  await expect(closingTile(page)).not.toHaveClass(/empty/);
  await expect(cardFaceOf(closingTile(page))).toBeVisible();

  await closingTile(page).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Schlussbild entfernen" }).click();
  await expect(dialog).toBeHidden();
  await editsStored(page);

  await expect(closingTile(page)).toHaveClass(/empty/);
  await expect(cardFaceOf(closingTile(page))).toHaveCount(0);
});

test("E2E-056 an entrance and a picture tint chosen on the title slide persist across a reload, and the tint shows on the tile", async ({
  page,
}) => {
  const dialog = page.getByRole("dialog");
  const entrance = dialog.getByRole("group", { name: "Einstieg" });
  const tint = dialog.getByRole("group", { name: "Tönung" });
  const wordByWord = entrance.getByRole("button", { name: "Wort für Wort" });
  const darkTint = tint.getByRole("button", { name: "Dunkel" });
  const lightTint = tint.getByRole("button", { name: "Hell" });
  const veilOfOpeningTile = openingTile(page).locator(".veil");
  const veilColour = (): Promise<string> =>
    veilOfOpeningTile.evaluate((veil) => getComputedStyle(veil).backgroundColor);
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"], 5);

  await openingTile(page).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: "Bild", exact: true }).click();
  await dialog.getByRole("radio", { name: "Bild 1" }).click();
  await wordByWord.click();
  await expect(wordByWord).toHaveAttribute("aria-pressed", "true");
  await darkTint.click();
  await expect(darkTint).toHaveAttribute("aria-pressed", "true");
  await editsStored(page);
  await dialog.getByRole("button", { name: "Fertig" }).click();
  await expect(dialog).toBeHidden();

  await expect(veilOfOpeningTile).toBeVisible();
  const darkVeil = await veilColour();

  await openingTile(page).click();
  await lightTint.click();
  await expect(lightTint).toHaveAttribute("aria-pressed", "true");
  await editsStored(page);
  await dialog.getByRole("button", { name: "Fertig" }).click();
  await expect(dialog).toBeHidden();
  await expect(veilOfOpeningTile).toBeVisible();
  expect(await veilColour()).not.toBe(darkVeil);

  await darkTintAgain(page);
  await page.reload();
  await expect(veilOfOpeningTile).toBeVisible();
  expect(await veilColour()).toBe(darkVeil);
  await openingTile(page).click();
  await expect(wordByWord).toHaveAttribute("aria-pressed", "true");
  await expect(darkTint).toHaveAttribute("aria-pressed", "true");
  await expect(lightTint).toHaveAttribute("aria-pressed", "false");
});

/** Switches the open title slide's sheet back to the dark tint and closes it. */
async function darkTintAgain(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog");
  await openingTile(page).click();
  await dialog
    .getByRole("group", { name: "Tönung" })
    .getByRole("button", { name: "Dunkel" })
    .click();
  await editsStored(page);
  await dialog.getByRole("button", { name: "Fertig" }).click();
  await expect(dialog).toBeHidden();
}
