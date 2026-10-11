import { expect, test, type Page } from "@playwright/test";
import { CREATED_TOAST, GERMAN_BROWSER, openImport } from "./support/app";
import { openApp } from "./support/browser";
import { fakeGlissandoServer, LIBRARY_PAGE } from "./support/fake-glissando-server";
import { pictureTakenOn } from "./support/media";

test.use(GERMAN_BROWSER);

/** Makes a slideshow on the fake server from its Immich photos, and stays on its screen. */
async function createServerSlideshow(page: Page): Promise<void> {
  await openImport(page);
  await page.getByRole("button", { name: /^Glissando-Server/ }).click();
  await page.getByRole("button", { name: "Immich öffnen" }).click();
  for (const { originalFileName } of LIBRARY_PAGE.assets.items) {
    await page.getByRole("button", { name: originalFileName, exact: true }).click();
  }
  await page.locator(".actions").getByRole("button", { name: "3 hinzufügen" }).click();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expect(page.getByRole("status").filter({ hasText: CREATED_TOAST })).toBeVisible();
}

test("E2E-043 a server slideshow shared from its info panel plays from its link in another page, and the link shows as gone once turned off", async ({
  page,
}) => {
  let jpeg: Uint8Array | null = null;
  await fakeGlissandoServer(page, () => {
    if (jpeg === null) throw new Error("a photo was asked for before the case made one");
    return jpeg;
  });
  await openApp(page);
  jpeg = (await pictureTakenOn(page, "photo.jpg", "2019-07-02", "#4db6ac")).buffer;
  await createServerSlideshow(page);

  await page.getByRole("button", { name: /^Link teilen/ }).click();
  const sheet = page.getByRole("dialog", { name: "Per Link teilen" });
  await sheet.getByRole("button", { name: "Link erstellen" }).click();
  const link = sheet.getByRole("status", { name: "Link" });
  await expect(link).toHaveText(/\/s\/[\w-]{22}$/);
  const url = (await link.textContent()) ?? "";
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(page.getByRole("button", { name: /^Per Link geteilt/ })).toBeVisible();

  const recipient = await page.context().newPage();
  await recipient.goto(url);
  await expect(recipient.locator("html")).toHaveAttribute("data-state", "start");
  await recipient.getByRole("button", { name: "Abspielen" }).click();
  await expect(recipient.locator("html")).toHaveAttribute("data-state", "playing");

  await page.getByRole("button", { name: /^Per Link geteilt/ }).click();
  await sheet.getByRole("button", { name: "Link ausschalten" }).click();
  await page
    .getByRole("dialog", { name: "Link ausschalten?" })
    .getByRole("button", { name: "Link ausschalten" })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "Link ausgeschaltet" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Link teilen/ })).toBeVisible();

  await recipient.reload();
  await expect(recipient.locator("html")).toHaveAttribute("data-state", "gone");
  await expect(recipient.getByText("Dieser Link funktioniert nicht mehr")).toBeVisible();
  await expect(recipient.getByRole("button", { name: "Abspielen" })).toHaveCount(0);
});
