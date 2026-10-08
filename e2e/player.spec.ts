import { expect, test, type Page } from "@playwright/test";
import { createSlideshow, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

const TITLE = "Juli 2025";
const SHORTEST_SECONDS_PER_PICTURE = 2;
const LONGEST_SECONDS_PER_PICTURE = 15;

function player(page: Page) {
  return page.getByRole("dialog", { name: TITLE });
}

/** Two pictures shown `secondsPerPicture` each, playing from the first. */
async function playTwoPictures(page: Page, secondsPerPicture: number): Promise<void> {
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14"], secondsPerPicture);
  await page.getByRole("button", { name: "Abspielen" }).last().click();
  await expect(player(page)).toBeVisible();
}

test("E2E-009 the player's keys pause, play, advance and close", async ({ page }) => {
  // Long pictures, so the first is still showing when the keys are pressed.
  await playTwoPictures(page, LONGEST_SECONDS_PER_PICTURE);
  await expect(player(page).getByText("1 / 2", { exact: true })).toBeVisible();
  const playPause = player(page).getByRole("button", { name: /^(Pause|Abspielen)$/ });
  await expect(playPause).toHaveAccessibleName("Pause");

  await page.keyboard.press("Space");
  await expect(playPause).toHaveAccessibleName("Abspielen");
  await page.keyboard.press("Space");
  await expect(playPause).toHaveAccessibleName("Pause");

  await page.keyboard.press("ArrowRight");
  await expect(player(page).getByText("2 / 2", { exact: true })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
  await expect(player(page)).toBeHidden();
});

test("E2E-010 a slideshow played to its end shows the end card", async ({ page }) => {
  await playTwoPictures(page, SHORTEST_SECONDS_PER_PICTURE);
  await page.keyboard.press("ArrowRight");
  await expect(player(page).getByText("2 / 2", { exact: true })).toBeVisible();

  await expect(player(page).getByRole("heading", { name: "Ende" })).toBeVisible();
  await expect(player(page).getByRole("button", { name: "Nochmal" })).toBeVisible();
  await expect(player(page).getByRole("button", { name: "Schließen", exact: true })).toBeVisible();
});
