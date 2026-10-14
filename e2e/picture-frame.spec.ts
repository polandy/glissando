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
async function openAppWithServer(page: Page, path = "/"): Promise<void> {
  let jpeg: Uint8Array | null = null;
  await fakeGlissandoServer(page, () => {
    if (jpeg === null) throw new Error("a photo was asked for before the case made one");
    return jpeg;
  });
  await openApp(page, path);
  jpeg = (await pictureTakenOn(page, "photo.jpg", "2019-07-02", "#4db6ac")).buffer;
}

test("E2E-047 the picture frame is set up from the start screen, runs full screen and its tap controls exit back to the start screen on both the button and Esc", async ({
  page,
}) => {
  // A long `controlsVisibleMs` (`browser-frame-device.ts`) keeps the tap controls up for every
  // step below, instead of racing their real 4 s auto-hide (`tap-controls.ts`); that auto-hide
  // itself is proven deterministically at the unit level (`tap-controls.test.ts`).
  await openAppWithServer(page, "/?controlsVisibleMs=60000");

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
  await pauseButton.click();
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

test("E2E-057 the picture frame card is hidden with its close button, stays hidden after a reload, the frame is still set up from Settings and the card is brought back there", async ({
  page,
}) => {
  await openAppWithServer(page);
  await expect(setUpCard(page)).toBeVisible();

  await page.getByRole("button", { name: "Bilderrahmen-Karte ausblenden" }).click();
  await expect(
    page.getByText("Bilderrahmen ausgeblendet. In den Einstellungen holst du ihn zurück."),
  ).toBeVisible();
  await expect(setUpCard(page)).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("button", { name: "Neue Diashow" })).toBeVisible();
  await expect(setUpCard(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Einstellungen" }).click();
  await expect(page.getByText("In diesem Browser ausgeblendet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Bilderrahmen einrichten" }).click();
  await expect(startFrameButton(page)).toBeInViewport();

  await page.goBack();
  await page.getByRole("button", { name: "Einstellungen" }).click();
  await expect(page.getByText("In diesem Browser ausgeblendet", { exact: true })).toBeVisible();
  await toggleSwitch(page, "Karte auf der Startseite zeigen");
  await expect(page.getByText("Steht über deinen Diashows", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(setUpCard(page)).toBeVisible();
});

test("E2E-058 the picture frame card's undo toast brings the card back at once", async ({
  page,
}) => {
  await openAppWithServer(page);

  await page.getByRole("button", { name: "Bilderrahmen-Karte ausblenden" }).click();
  await expect(setUpCard(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Rückgängig" }).click();

  await expect(setUpCard(page)).toBeVisible();
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
