import { expect, test } from "@playwright/test";
import { createSlideshow, GERMAN_BROWSER, openImport } from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

const PHONE = { width: 412, height: 915 };

test("E2E-088 each slideshow action has one way in: the cover plays, the strip head adds, Open file lives on the start screen", async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await openApp(page);
  const openFile = page.getByRole("button", { name: "Datei öffnen" });
  await expect(openFile).toBeVisible();

  await openImport(page);

  await expect(page.getByRole("button", { name: "Bilder auswählen" })).toBeVisible();
  await expect(openFile).toHaveCount(0);
  await expect(page.getByRole("button", { name: ".glissando-Datei öffnen" })).toHaveCount(0);

  await page.goto("/");
  await createSlideshow(page, ["2025-07-12", "2025-07-14"]);

  const play = page.getByRole("button", { name: /^Abspielen/ });
  await expect(play).toHaveCount(1);
  await expect(play).toBeVisible();
  const add = page.getByRole("button", { name: "Bilder hinzufügen" });
  await expect(add).toHaveCount(1);
  await expect(
    page.locator(".strip-head").getByRole("button", { name: "Auswählen" }),
  ).toBeVisible();
  await page.locator(".strip-head").getByRole("button", { name: "Mischen" }).click();
  await expect(page.getByText("Halten und ziehen zum Umsortieren")).toBeVisible();

  await play.click();
  const player = page.getByRole("dialog", { name: "Juli 2025" });
  await expect(player).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(player).toBeHidden();

  await add.click();
  await expect(page.getByRole("heading", { name: "Bilder hinzufügen" })).toBeVisible();
});
