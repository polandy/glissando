import type { Locator, Page } from "@playwright/test";

export type Box = NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>;

export interface Point {
  x: number;
  y: number;
}

/** Pointer travel split into steps, so a drag passes the app's drag thresholds as a hand does. */
export const DRAG_STEPS = 8;

/** The layout box of `locator`; throws when it is not shown. */
export async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("the element has no layout box");
  return box;
}

/** The centre of `target` on the page. */
export async function centreOf(target: Locator): Promise<Point> {
  const box = await boxOf(target);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A mouse drag from `from` to `to`: press, move there in steps, release. */
export async function drag(page: Page, from: Point, to: Point): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: DRAG_STEPS });
  await page.mouse.up();
}
