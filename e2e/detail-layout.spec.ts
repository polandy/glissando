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

test("E2E-067 on a tablet the info panel stacks above the pictures with fine settings folded away", async ({
  page,
}) => {
  await page.setViewportSize(TABLET);
  await openApp(page);
  await createSlideshow(page, ["2025-07-01", "2025-07-02", "2025-07-03"], 2);

  const { panel, picture } = await panelAndFirstPicture(page);
  expect(panel.y + panel.height).toBeLessThanOrEqual(picture.y);
  expect(panel.width).toBeGreaterThan(TABLET.width * 0.8);

  const transitions = page.getByRole("button", { name: /^Übergänge/ });
  const fineSettings = page.getByRole("button", { name: "Weitere Einstellungen" });
  await expect(page.getByRole("button", { name: "Abspielen" })).toHaveCount(1);
  await expect(
    page.getByRole("complementary").getByRole("button", { name: "Abspielen" }),
  ).toHaveCount(0);
  // The Music/Mood/Look tiles are never folded, each one its own button.
  await expect(page.getByRole("button", { name: /^Musik/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Stimmung/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Look/ })).toBeVisible();
  await expect(transitions).toBeHidden();
  await expect(fineSettings).toHaveAttribute("aria-expanded", "false");
  const panelFolded = await boxOf(page.getByRole("complementary"));

  await fineSettings.click();

  await expect(fineSettings).toHaveAttribute("aria-expanded", "true");
  await expect(transitions).toBeVisible();
  // Opened, the fold's rows push the panel taller than folded.
  const panelOpen = await boxOf(page.getByRole("complementary"));
  expect(panelOpen.height).toBeGreaterThan(panelFolded.height);

  await fineSettings.click();
  await expect(transitions).toBeHidden();
});

test("E2E-068 on a desktop the info panel stays beside the pictures, fine settings folds there too", async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await openApp(page);
  await createSlideshow(page, ["2025-07-01", "2025-07-02", "2025-07-03"], 2);

  const { panel, picture } = await panelAndFirstPicture(page);
  expect(panel.x).toBeGreaterThan(picture.x + picture.width);

  const transitions = page.getByRole("button", { name: /^Übergänge/ });
  const fineSettings = page.getByRole("button", { name: "Weitere Einstellungen" });
  await expect(page.getByRole("button", { name: /^Musik/ })).toBeVisible();
  await expect(fineSettings).toHaveAttribute("aria-expanded", "false");
  await expect(transitions).toBeHidden();

  await fineSettings.click();

  await expect(fineSettings).toHaveAttribute("aria-expanded", "true");
  await expect(transitions).toBeVisible();
});
