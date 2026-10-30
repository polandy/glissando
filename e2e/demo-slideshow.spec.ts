import { expect, test } from "@playwright/test";
import { GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { DEMO_URL } from "./support/demo-slideshow";
import { exportedFileWithRealMedia } from "./support/real-glissando-file";

test.use(GERMAN_BROWSER);

const DEMO_TITLE = "Herbst in Wien";

test("E2E-062 tapping the demo card on an empty library opens the demo slideshow, which then replaces the card with the library", async ({
  page,
}) => {
  await page.route(DEMO_URL, async (route) => {
    await route.fulfill({ body: (await exportedFileWithRealMedia()).buffer });
  });
  await openApp(page);

  const demoCard = page.getByRole("button", { name: "Demo-Slideshow laden" });
  await expect(demoCard).toBeVisible();

  await demoCard.click();

  await expect(page.getByRole("heading", { name: DEMO_TITLE })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(`„${DEMO_TITLE}“ geöffnet`);

  await page.getByRole("button", { name: "Zurück" }).click();

  await expect(page.getByRole("heading", { name: "Deine Diashows" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(DEMO_TITLE) })).toBeVisible();
  await expect(page.getByRole("button", { name: "Demo-Slideshow laden" })).toHaveCount(0);
});
