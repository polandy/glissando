import { expect, test, type Page } from "@playwright/test";
import {
  captionField,
  captionPicture,
  createSlideshow,
  definitionOf,
  editPicture,
  editsStored,
  GERMAN_BROWSER,
} from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

const TITLE = "Juli 2025";
const FIRST_TILE = "Bild 1, aufgenommen am 12.07.2025";
const CAPTION = "Abends am Steg";
/** Long pictures, so the first is still showing while the case reads its caption. */
const LONGEST_SECONDS_PER_PICTURE = 15;

function player(page: Page) {
  return page.getByRole("dialog", { name: TITLE });
}

/** Plays the slideshow from its first picture; the caption region speaks the shown caption. */
async function playFirstPicture(page: Page) {
  await page.getByRole("button", { name: "Abspielen" }).last().click();
  await expect(player(page).getByText("1 / 2", { exact: true })).toBeVisible();
  return player(page).locator(".caption-text");
}

async function closePlayer(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await expect(player(page)).toBeHidden();
}

test("E2E-021 a picture's caption is stored, shown by the player, counted, and cleared with ×", async ({
  page,
}) => {
  const captions = definitionOf(page, "Bildtitel");
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14"], LONGEST_SECONDS_PER_PICTURE);
  await expect(captions).toHaveText("0 von 2");

  await captionPicture(page, FIRST_TILE, CAPTION);
  await expect(captions).toHaveText("1 von 2");

  await editPicture(page, FIRST_TILE);
  await page.reload();
  await expect(captionField(page)).toHaveValue(CAPTION);
  await page.getByRole("button", { name: "Zurück", exact: true }).click();

  const spoken = await playFirstPicture(page);
  await expect(spoken).toHaveText(CAPTION);
  await closePlayer(page);

  await editPicture(page, FIRST_TILE);
  await page.getByRole("button", { name: "Bildtitel leeren" }).click();
  await expect(captionField(page)).toHaveValue("");
  await expect(captionField(page)).toBeFocused();
  await editsStored(page);
  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await expect(captions).toHaveText("0 von 2");

  const spokenAfterClearing = await playFirstPicture(page);
  await expect(spokenAfterClearing).toHaveText("");
});
