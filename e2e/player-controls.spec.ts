// Spec: docs/dev/app/PLAYER_OVERLAY.md
import { expect, test, type Page } from "@playwright/test";
import { createSlideshow, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { player } from "./support/player";

test.use(GERMAN_BROWSER);

const TITLE = "Juli 2025";
const SECONDS_PER_PICTURE = 15;
const CLOCK_START = new Date("2026-01-01T12:00:00Z").getTime();
const CLOCK_HOLD_MS = 600_000;
const CONTROLS_HIDE_DELAY_MS = 2500;
const SECOND_PICTURE_SECONDS = 20;

/** Two long pictures playing from the first, on a page clock held still until a case runs it. */
async function playTwoPicturesOnHeldClock(page: Page): Promise<void> {
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14"], SECONDS_PER_PICTURE);
  await page.clock.install({ time: CLOCK_START });
  await page.clock.pauseAt(CLOCK_START + CLOCK_HOLD_MS);
  await page.getByRole("button", { name: "Abspielen" }).last().click();
  await expect(player(page, TITLE)).toHaveAttribute("aria-busy", "false");
}

function seekBar(page: Page) {
  return player(page, TITLE).getByRole("slider", { name: "Position" });
}

test("E2E-136 the seek bar jumps to the picture at the chosen time", async ({ page }) => {
  await playTwoPicturesOnHeldClock(page);
  await expect(player(page, TITLE).getByText("1 / 2", { exact: true })).toBeVisible();

  await seekBar(page).fill(String(SECOND_PICTURE_SECONDS));

  await expect(player(page, TITLE).getByText("2 / 2", { exact: true })).toBeVisible();
  await expect(seekBar(page)).toHaveAttribute("aria-valuetext", "0:20");
});

/** A click without the pointer move `mouse.click` sends first, which would reveal the controls. */
async function tapInPlace(page: Page): Promise<void> {
  await page.mouse.down();
  await page.mouse.up();
}

test("E2E-137 a tap hides and shows the controls, and playing hides them after 2.5 s", async ({
  page,
}) => {
  await playTwoPicturesOnHeldClock(page);
  const controls = player(page, TITLE).getByRole("button", { name: "Pause" });
  await expect(controls).toBeVisible();
  await expect(player(page, TITLE)).toHaveCSS("cursor", "auto");

  // Just short of the delay the controls are still there.
  await page.clock.fastForward(CONTROLS_HIDE_DELAY_MS - 1);
  await expect(controls).toBeVisible();
  await expect(player(page, TITLE)).toHaveCSS("cursor", "auto");

  await page.clock.fastForward(1);
  await expect(player(page, TITLE)).toHaveCSS("cursor", "none");
  // Hidden controls are faded out and inert: they take no focus.
  await controls.focus();
  await expect(controls).not.toBeFocused();

  // The pointer rests on the picture: a tap hides the controls, a second tap brings them back.
  await page.mouse.move(100, 200);
  await expect(controls).toBeVisible();
  await tapInPlace(page);
  await expect(player(page, TITLE)).toHaveCSS("cursor", "none");
  await tapInPlace(page);
  await expect(controls).toBeVisible();
  await expect(player(page, TITLE)).toHaveCSS("cursor", "auto");
});

test("E2E-152 a mouse move brings the hidden controls back", async ({ page }) => {
  await playTwoPicturesOnHeldClock(page);
  await page.clock.fastForward(CONTROLS_HIDE_DELAY_MS);
  await expect(player(page, TITLE)).toHaveCSS("cursor", "none");

  await page.mouse.move(120, 220);

  await expect(player(page, TITLE)).toHaveCSS("cursor", "auto");
  await expect(player(page, TITLE).getByRole("button", { name: "Pause" })).toBeVisible();
});

test("E2E-153 the controls stay while keyboard focus is inside them", async ({ page }) => {
  await playTwoPicturesOnHeldClock(page);
  await page.clock.fastForward(CONTROLS_HIDE_DELAY_MS);
  await expect(player(page, TITLE)).toHaveCSS("cursor", "none");

  await page.keyboard.press("Tab");
  const focused = player(page, TITLE).locator(":focus");
  await expect(focused).toBeVisible();
  await expect(player(page, TITLE)).toHaveCSS("cursor", "auto");

  await page.clock.fastForward(CONTROLS_HIDE_DELAY_MS * 4);
  await expect(focused).toBeFocused();
  await expect(player(page, TITLE)).toHaveCSS("cursor", "auto");
});

test("E2E-138 Back more than a second into a picture restarts it, else goes to the one before", async ({
  page,
}) => {
  await playTwoPicturesOnHeldClock(page);
  await seekBar(page).fill(String(SECOND_PICTURE_SECONDS));
  await expect(player(page, TITLE).getByText("2 / 2", { exact: true })).toBeVisible();

  await page.keyboard.press("ArrowLeft");
  await expect(player(page, TITLE).getByText("2 / 2", { exact: true })).toBeVisible();
  await expect(seekBar(page)).toHaveAttribute("aria-valuetext", "0:15");

  await page.keyboard.press("ArrowLeft");
  await expect(player(page, TITLE).getByText("1 / 2", { exact: true })).toBeVisible();
  await expect(seekBar(page)).toHaveAttribute("aria-valuetext", "0:00");
});
