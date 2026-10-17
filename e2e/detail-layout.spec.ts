import { expect, test, type Locator, type Page } from "@playwright/test";
import { createSlideshow, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

type Box = NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>;

const TABLET = { width: 820, height: 1180 };
const DESKTOP = { width: 1280, height: 800 };

test.use(GERMAN_BROWSER);

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("the element has no layout box");
  return box;
}

async function panelAndFirstPicture(page: Page): Promise<{ panel: Box; picture: Box }> {
  const firstPicture = page.getByRole("button", {
    name: "Bild 1, aufgenommen am 01.07.2025",
    exact: true,
  });
  return {
    panel: await boxOf(page.getByRole("complementary")),
    picture: await boxOf(firstPicture),
  };
}

test("E2E-067 on a tablet the info panel stacks above the pictures with its details folded away", async ({
  page,
}) => {
  await page.setViewportSize(TABLET);
  await openApp(page);
  await createSlideshow(page, ["2025-07-01", "2025-07-02", "2025-07-03"], 2);

  const { panel, picture } = await panelAndFirstPicture(page);
  expect(panel.y + panel.height).toBeLessThanOrEqual(picture.y);
  expect(panel.width).toBeGreaterThan(TABLET.width * 0.8);
  // Folded, the panel is a slim header, not a block that pushes the pictures down.
  expect(panel.height).toBeLessThan(200);

  const transitions = page.getByRole("button", { name: /^Übergänge/ });
  const details = page.getByRole("button", { name: "Details" });
  await expect(
    page.getByRole("complementary").getByRole("button", { name: "Abspielen" }),
  ).toBeVisible();
  await expect(transitions).toBeHidden();
  await expect(details).toHaveAttribute("aria-expanded", "false");

  await details.click();
  await expect(details).toHaveAttribute("aria-expanded", "true");
  await expect(transitions).toBeVisible();

  await details.click();
  await expect(transitions).toBeHidden();
});

test("E2E-068 on a desktop the info panel stays beside the pictures, everything shown", async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await openApp(page);
  await createSlideshow(page, ["2025-07-01", "2025-07-02", "2025-07-03"], 2);

  const { panel, picture } = await panelAndFirstPicture(page);
  expect(panel.x).toBeGreaterThan(picture.x + picture.width);
  await expect(page.getByRole("button", { name: "Details" })).toBeHidden();
  await expect(page.getByRole("button", { name: /^Übergänge/ })).toBeVisible();
});
