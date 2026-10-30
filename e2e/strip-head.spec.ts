import { expect, test, type Locator } from "@playwright/test";
import { createSlideshow, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

/** The reference phone, a Pixel 9 Pro, in CSS pixels. */
const PHONE = { width: 412, height: 915 };

test.use({ ...GERMAN_BROWSER, viewport: PHONE });

type Box = { x: number; y: number; width: number; height: number };

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("the element has no box on screen");
  return box;
}

test("E2E-092 on a phone in German the strip head's eyebrow and count stay clear of Mischen, Auswählen and Hinzufügen", async ({
  page,
}) => {
  await openApp(page);
  await createSlideshow(page, ["2025-07-01", "2025-07-02", "2025-07-03"]);
  const head = page.locator(".strip-head");
  const eyebrow = head.getByRole("heading", { name: "Bilder" });
  const count = head.locator(".count");
  const buttons = [
    head.getByRole("button", { name: "Mischen" }),
    head.getByRole("button", { name: "Auswählen" }),
    head.getByRole("button", { name: "Medien hinzufügen" }),
  ];
  await expect(eyebrow).toBeAttached();
  await expect(count).toHaveText("3");

  // The eyebrow shows in full: beside the buttons German squeezes it to nothing.
  const clipped = await eyebrow.evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(clipped).toBe(false);
  for (const button of buttons) {
    await expect(button).toBeVisible();
    const buttonBox = await boxOf(button);
    expect(overlaps(await boxOf(eyebrow), buttonBox)).toBe(false);
    expect(overlaps(await boxOf(count), buttonBox)).toBe(false);
    expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(PHONE.width);
  }
});
