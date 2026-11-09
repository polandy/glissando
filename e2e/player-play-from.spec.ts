import { expect, test } from "@playwright/test";
import { createSlideshow, editPicture, GERMAN_BROWSER, selectionBar } from "./support/app";
import { openApp } from "./support/browser";
import { player } from "./support/player";
import { tile } from "./support/strip";
import { stripHead } from "./support/strip-head";

test.use(GERMAN_BROWSER);

const TITLE = "Juli 2025";
// Long pictures, so the slide the player opens on is still showing when it is read.
const LONG_SECONDS_PER_PICTURE = 15;
const PLAY_FROM_HERE = "Ab hier abspielen";

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"], LONG_SECONDS_PER_PICTURE);
});

test("E2E-111 the selection bar's Play from here plays from the one selected picture, and is absent with two selected", async ({
  page,
}) => {
  const bar = selectionBar(page);
  await tile(page, 2, "14.07.2025").click();
  await expect(bar.getByRole("button", { name: "Bearbeiten" })).toBeVisible();
  await bar.getByRole("button", { name: PLAY_FROM_HERE }).click();

  await expect(player(page, TITLE)).toBeVisible();
  await expect(player(page, TITLE).getByText("2 / 3", { exact: true })).toBeVisible();

  // Closing returns to the screen Play was tapped on, the picture still selected.
  await page.keyboard.press("Escape");
  await expect(player(page, TITLE)).toBeHidden();
  await expect(tile(page, 2, "14.07.2025")).toHaveAttribute("aria-pressed", "true");

  // Selecting mode lets a second tap add to the selection.
  await stripHead(page).getByRole("button", { name: "Auswählen" }).click();
  await tile(page, 3, "20.07.2025").click();
  await expect(tile(page, 3, "20.07.2025")).toHaveAttribute("aria-pressed", "true");
  await expect(tile(page, 2, "14.07.2025")).toHaveAttribute("aria-pressed", "true");
  await expect(bar.getByRole("button", { name: "Fertig" })).toBeVisible();
  await expect(bar.getByRole("button", { name: PLAY_FROM_HERE })).toHaveCount(0);
});

test("E2E-112 the picture viewer's Play from here plays from the picture shown", async ({
  page,
}) => {
  await tile(page, 1, "12.07.2025").click();
  await selectionBar(page).getByRole("button", { name: "Ansehen" }).click();
  const viewer = page.getByRole("dialog").filter({ hasText: "von 3" });
  await expect(viewer.getByText("1 von 3")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText("3 von 3")).toBeVisible();

  await viewer.getByRole("button", { name: PLAY_FROM_HERE }).click();
  await expect(player(page, TITLE)).toBeVisible();
  await expect(player(page, TITLE).getByText("3 / 3", { exact: true })).toBeVisible();
});

test("E2E-113 the picture editor header's Play from here plays from the edited picture", async ({
  page,
}) => {
  await editPicture(page, "Bild 3, aufgenommen am 20.07.2025");
  await page.getByRole("button", { name: PLAY_FROM_HERE }).click();

  await expect(player(page, TITLE)).toBeVisible();
  await expect(player(page, TITLE).getByText("3 / 3", { exact: true })).toBeVisible();
});
