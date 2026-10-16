import { expect, test } from "@playwright/test";
import { chooseFiles, GERMAN_BROWSER, openImport } from "./support/app";
import { openApp } from "./support/browser";
import { pictureTakenOn } from "./support/media";

test.use(GERMAN_BROWSER);

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("E2E-050 a picture of the pictures step opens full screen, browses, removes and closes", async ({
  page,
}, testInfo) => {
  const files = [
    await pictureTakenOn(page, "harbour.jpg", "2025-07-12", "#2e7d32"),
    await pictureTakenOn(page, "pier.jpg", "2025-07-13", "#1a237e"),
    await pictureTakenOn(page, "lake.jpg", "2025-07-14", "#ffd54f"),
  ];
  await openImport(page);
  await chooseFiles(page, page.getByRole("button", { name: "Bilder auswählen" }), files);

  const opener = page.getByRole("button", { name: "Bild vom 13.07.2025 um 12:00:00 ansehen" });
  await opener.click();

  const viewer = page.getByRole("dialog");
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText("2 von 3")).toBeVisible();
  await testInfo.attach("viewer", {
    body: await page.screenshot(),
    contentType: "image/png",
  });

  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText("3 von 3")).toBeVisible();
  await viewer.getByRole("button", { name: "Bild 1 zeigen" }).click();
  await expect(viewer.getByText("1 von 3")).toBeVisible();

  await viewer.getByRole("button", { name: "Entfernen" }).click();
  await expect(viewer.getByText("1 von 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rückgängig" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Bild vom 13.07.2025 um 12:00:00 ansehen" }),
  ).toBeFocused();
});
