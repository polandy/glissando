import { expect, test, type CDPSession, type Locator, type Page } from "@playwright/test";
import { createSlideshow, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { HOLD_MS } from "../src/app/screens/slideshow/tile-drag-types";

/** The reference phone, a Pixel 9 Pro, in CSS pixels. */
const PHONE = { width: 412, height: 915 };
const PICTURE_COUNT = 24;
const DAYS = Array.from(
  { length: PICTURE_COUNT },
  (_, index) => `2025-07-${String(index + 1).padStart(2, "0")}`,
);
/** Distance from the screen's bottom edge that is inside the strip's auto-scroll zone (64 px). */
const EDGE_REST_PX = 20;
/** A y on the screen that is clear of both auto-scroll zones. */
const MIDDLE_Y = PHONE.height / 2;
const STEPS = 12;
/** More than the 8 px a hold tolerates and a lifted tile needs to start dragging. */
const MOVE_PX = 8;
const RIGHT_HALF = 0.75;

test.use({ ...GERMAN_BROWSER, hasTouch: true, isMobile: true, viewport: PHONE });

function tile(page: Page, number: number): Locator {
  const day = String(number).padStart(2, "0");
  return page.getByRole("button", {
    name: `Bild ${String(number)}, aufgenommen am ${day}.07.2025`,
    exact: true,
  });
}

/** The tile at `position` whatever picture it shows, by its number in the label. */
function tileAt(page: Page, position: number): Locator {
  return page.getByRole("button", { name: new RegExp(`^Bild ${String(position)}, `) });
}

async function centre(locator: Locator): Promise<{ x: number; y: number; width: number }> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("the tile has no box");
  return { x: box.x, y: box.y + box.height / 2, width: box.width };
}

type TouchPhase = "touchStart" | "touchMove" | "touchEnd";
interface TouchPoint {
  readonly x: number;
  readonly y: number;
  readonly id: number;
}

/** One real finger through Chromium's DevTools protocol: the browser's own touch pipeline. */
class Finger {
  constructor(private readonly session: CDPSession) {}

  async down(x: number, y: number): Promise<void> {
    await this.send("touchStart", [{ x, y, id: 1 }]);
  }

  async move(x: number, y: number): Promise<void> {
    await this.send("touchMove", [{ x, y, id: 1 }]);
  }

  async up(): Promise<void> {
    await this.send("touchEnd", []);
  }

  private async send(type: TouchPhase, touchPoints: TouchPoint[]): Promise<void> {
    await this.session.send("Input.dispatchTouchEvent", { type, touchPoints });
  }
}

test("E2E-105 on a phone a picture moves from 1 to 10 in one hold-and-drag gesture", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Genuine touch input exists only through Chromium's DevTools protocol",
  );
  await openApp(page);
  await createSlideshow(page, DAYS, 2);
  const first = tile(page, 1);
  await expect(tile(page, PICTURE_COUNT)).toBeAttached();
  const finger = new Finger(await page.context().newCDPSession(page));

  const start = await centre(first);
  const startX = start.x + start.width / 2;
  await finger.down(startX, start.y);
  // The lift shows nothing until the finger moves, and moving early cancels the hold. A timer
  // set now, with a later deadline than the hold's, runs after the hold has fired.
  await page.evaluate((ms) => new Promise((done) => setTimeout(done, ms)), HOLD_MS + 1);
  await finger.move(startX, start.y + 2 * MOVE_PX);
  await expect(page.locator(".ghost")).toBeVisible();

  // Down to the bottom edge: the strip scrolls by itself until picture 10 has come into view.
  for (let step = 1; step <= STEPS; step += 1) {
    await finger.move(startX, start.y + ((PHONE.height - EDGE_REST_PX - start.y) * step) / STEPS);
  }
  await expect
    .poll(async () => ((await tile(page, 10).boundingBox())?.y ?? Infinity) < MIDDLE_Y)
    .toBe(true);
  // Out of the edge zone the scrolling stops; then the finger goes onto picture 10's right half.
  await finger.move(startX, MIDDLE_Y);
  const tenth = await centre(tile(page, 10));
  await finger.move(tenth.x + tenth.width * RIGHT_HALF, tenth.y);
  const settled = await centre(tile(page, 10));
  expect(Math.abs(settled.y - tenth.y)).toBeLessThan(settled.width);
  await finger.move(settled.x + settled.width * RIGHT_HALF, settled.y);
  await finger.up();

  // Picture 1 now sits at 10; the former 2 to 10 moved up by one.
  await expect(page.locator(".ghost")).toBeHidden();
  await expect(tileAt(page, 10)).toHaveAccessibleName("Bild 10, aufgenommen am 01.07.2025");
  await expect(tileAt(page, 1)).toHaveAccessibleName("Bild 1, aufgenommen am 02.07.2025");
  await expect(tileAt(page, 9)).toHaveAccessibleName("Bild 9, aufgenommen am 10.07.2025");
  await expect(tileAt(page, 11)).toHaveAccessibleName("Bild 11, aufgenommen am 11.07.2025");
});

test("E2E-106 on a phone the keyboard still reorders a picture, Shift and an arrow at a time", async ({
  page,
}) => {
  await openApp(page);
  await createSlideshow(page, DAYS.slice(0, 12), 2);
  await tile(page, 1).focus();
  await expect(tile(page, 1)).toBeFocused();

  for (let step = 0; step < 9; step += 1) {
    await page.keyboard.press("Shift+ArrowRight");
  }
  await expect(tileAt(page, 10)).toHaveAccessibleName("Bild 10, aufgenommen am 01.07.2025");
  await expect(tileAt(page, 1)).toHaveAccessibleName("Bild 1, aufgenommen am 02.07.2025");

  await page.keyboard.press("Shift+ArrowLeft");
  await expect(tileAt(page, 9)).toHaveAccessibleName("Bild 9, aufgenommen am 01.07.2025");
});
