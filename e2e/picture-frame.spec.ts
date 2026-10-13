import { expect, test, type Locator, type Page } from "@playwright/test";
import { GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { fakeGlissandoServer } from "./support/fake-glissando-server";
import { pictureTakenOn } from "./support/media";

test.use(GERMAN_BROWSER);

/** The fixture albums (`src/immich/fixtures/albums.json`), by name. */
const LANDSCAPES_ALBUM_ID = "81d82341-f78f-43b8-8b6a-9e156b52f550";

function setUpCard(page: Page): Locator {
  return page.getByRole("button", { name: "Einrichten" });
}

function startFrameButton(page: Page): Locator {
  return page.getByRole("button", { name: "Rahmen starten" });
}

function exitButton(page: Page): Locator {
  return page.getByRole("button", { name: "‹ Rahmen verlassen" });
}

function albumTile(page: Page, name: string): Locator {
  return page.getByRole("button", { name: new RegExp(name) });
}

/**
 * Clicks `locator` once the tap controls are visible, re-tapping the stage first if they already
 * auto-hid again (`tap-controls.ts`'s real 4 s timeout, which a slow CI machine can let elapse
 * between an earlier reveal and this click). Once hidden, pointer-events:none on the bar means
 * Playwright refuses to even dispatch the click (the stage, not the button, is topmost), so a
 * single reveal-then-click can still lose the race if the timeout lands in between; retrying the
 * whole reveal-and-click as one unit (`toPass`), rather than waiting a fixed time, is what finally
 * makes it land regardless of how slow the machine is. The per-attempt click timeout is generous
 * (not a tight 1 s): on a contended CI runner, resolving `getByRole` alone can take most of a
 * second, so a short timeout starved the actionability check every attempt and never gave the
 * click itself a chance to land, independent of the auto-hide race this helper exists for.
 */
async function clickWithControlsVisible(page: Page, locator: Locator): Promise<void> {
  await expect(async () => {
    const opacity = await exitButton(page).evaluate((el) => getComputedStyle(el).opacity);
    if (opacity !== "1") {
      await page.locator(".stage").click();
    }
    await locator.click({ timeout: 8000 });
  }).toPass({ timeout: 25000 });
}

/** The clock/date switches, which carry no accessible name of their own: found by their row. */
function settingSwitch(page: Page, label: string): Locator {
  return page
    .locator(".row")
    .filter({ has: page.getByText(label, { exact: true }) })
    .getByRole("switch");
}

/**
 * Toggles a setting switch: the input itself is visually hidden behind its track (`gl-radius-pill`
 * styling), so the click goes to the `<label>` wrapping both, the way a tap on the row would land.
 */
function toggleSwitch(page: Page, label: string): Promise<void> {
  return page
    .locator(".row")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator(".switch")
    .click();
}

/** Registers the fake server and loads the app, with a photo ready for every picture asked for. */
async function openAppWithServer(page: Page): Promise<void> {
  let jpeg: Uint8Array | null = null;
  await fakeGlissandoServer(page, () => {
    if (jpeg === null) throw new Error("a photo was asked for before the case made one");
    return jpeg;
  });
  await openApp(page);
  jpeg = (await pictureTakenOn(page, "photo.jpg", "2019-07-02", "#4db6ac")).buffer;
}

test("E2E-047 the picture frame is set up from the start screen, runs full screen and its tap controls exit back to the start screen on both the button and Esc", async ({
  page,
}) => {
  await openAppWithServer(page);

  await expect(page.getByText("Bilderrahmen", { exact: true })).toBeVisible();
  await setUpCard(page).click();

  // Regression: the set-up screen once rendered below the start screen, outside the viewport,
  // because both screens stayed mounted at once; the start screen's own button is proof it did
  // not just scroll out of view, but is gone.
  await expect(startFrameButton(page)).toBeInViewport();
  await expect(page.getByRole("button", { name: "Neue Diashow" })).toHaveCount(0);

  await albumTile(page, "Landscapes Lab").click();
  await expect(albumTile(page, "Landscapes Lab")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("3 Bilder · endlos", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "10 s" }).click();
  await expect(page.getByRole("button", { name: "10 s" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Neueste zuerst" }).click();
  await expect(page.getByRole("button", { name: "Neueste zuerst" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await toggleSwitch(page, "Uhr anzeigen");
  await toggleSwitch(page, "Datum anzeigen");
  await expect(settingSwitch(page, "Uhr anzeigen")).not.toBeChecked();
  await expect(settingSwitch(page, "Datum anzeigen")).not.toBeChecked();

  await startFrameButton(page).click();
  await expect(exitButton(page)).toBeVisible();

  // The controls stay hidden until a tap: proven by opacity, since the pill is in the DOM (so
  // the regular `toBeVisible` cannot tell idle from revealed) but not interactive while idle.
  await expect(exitButton(page)).toHaveCSS("opacity", "0");
  await page.locator(".stage").click();
  await expect(exitButton(page)).toHaveCSS("opacity", "1");
  const pauseButton = page.getByRole("button", { name: "Pause" });
  await expect(pauseButton).toBeVisible();
  await expect(page.getByRole("button", { name: "Weiter ›" })).toBeVisible();
  await clickWithControlsVisible(page, pauseButton);
  await expect(page.getByRole("button", { name: "Weiter", exact: true })).toBeVisible();

  // Exit (the running frame sits over the start screen, not its set-up screen: `src/app/navigation/route.ts`).
  await exitButton(page).click();
  await expect(setUpCard(page)).toBeVisible();
  await expect(exitButton(page)).toHaveCount(0);

  // The set-up choices survived the round trip: the next "Start frame" opens the same way
  // (E2E-048 covers a full reload).
  await setUpCard(page).click();
  await expect(albumTile(page, "Landscapes Lab")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "10 s" })).toHaveAttribute("aria-pressed", "true");

  await startFrameButton(page).click();
  await expect(exitButton(page)).toBeVisible();
  await page.locator(".stage").click();
  await expect(exitButton(page)).toHaveCSS("opacity", "1");
  await page.keyboard.press("Escape");
  await expect(setUpCard(page)).toBeVisible();
  await expect(exitButton(page)).toHaveCount(0);
});

test("E2E-048 the picture frame's set-up choices survive a reload", async ({ page }) => {
  await openAppWithServer(page);
  await setUpCard(page).click();

  await albumTile(page, "Faces Lab").click();
  await page.getByRole("button", { name: "1 min" }).click();
  await page.getByRole("button", { name: "Älteste zuerst" }).click();
  await toggleSwitch(page, "Uhr anzeigen");
  await toggleSwitch(page, "Datum anzeigen");

  // The album is only remembered once a frame actually starts with it.
  await startFrameButton(page).click();
  await expect(exitButton(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(setUpCard(page)).toBeVisible();

  await page.reload();
  await setUpCard(page).click();

  await expect(albumTile(page, "Faces Lab")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("6 Bilder · endlos", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "1 min" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Älteste zuerst" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(settingSwitch(page, "Uhr anzeigen")).not.toBeChecked();
  await expect(settingSwitch(page, "Datum anzeigen")).not.toBeChecked();
});

test("E2E-049 a #frame= link starts the frame directly, skipping set-up", async ({ page }) => {
  let jpeg: Uint8Array | null = null;
  await fakeGlissandoServer(page, () => {
    if (jpeg === null) throw new Error("a photo was asked for before the case made one");
    return jpeg;
  });
  await openApp(page, `/#frame=${LANDSCAPES_ALBUM_ID}`);
  jpeg = (await pictureTakenOn(page, "photo.jpg", "2019-07-02", "#4db6ac")).buffer;

  await expect(exitButton(page)).toBeVisible();
  // The default showDate stamps the running picture with the album's own name: proof the deep
  // link's album, not just any frame, is the one playing.
  await expect(page.locator(".stamp")).toHaveText("Landscapes Lab");
});

test("E2E-050 the picture frame card is absent while Immich cannot be reached", async ({
  page,
}) => {
  const immichChecked = page.waitForResponse((response) =>
    /\/immich\/api\/server\/version$/.test(response.url()),
  );
  const libraryChecked = page.waitForResponse((response) =>
    /\/api\/library$/.test(new URL(response.url()).pathname),
  );
  await page.route("**/immich/**", (route) => route.fulfill({ status: 503 }));
  await page.route(/\/api\/library(\/.*)?$/, (route) => route.fulfill({ status: 404 }));

  await openApp(page);
  await Promise.all([immichChecked, libraryChecked]);

  // The rest of the (empty) start screen still renders normally: the absence is Immich's, not a
  // crash that happens to hide everything.
  await expect(page.getByText("Bilder rein, Diashow raus.", { exact: true })).toBeVisible();
  await expect(page.getByText("Bilderrahmen", { exact: true })).toHaveCount(0);
});
