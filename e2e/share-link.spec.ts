import { expect, test } from "@playwright/test";
import { GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { fakeGlissandoServer } from "./support/fake-glissando-server";
import { pictureTakenOn } from "./support/media";
import { chooseShareRow, openShare } from "./support/share";
import { createServerSlideshow } from "./support/server-slideshow";

test.use(GERMAN_BROWSER);

test("E2E-043 a server slideshow shared from its info panel plays from its link in another page, and the link shows as gone once turned off, and sharing again makes a new link", async ({
  page,
}) => {
  let jpeg: Uint8Array | null = null;
  const server = await fakeGlissandoServer(page, () => {
    if (jpeg === null) throw new Error("a photo was asked for before the case made one");
    return jpeg;
  });
  await openApp(page);
  jpeg = (await pictureTakenOn(page, "photo.jpg", "2019-07-02", "#4db6ac")).buffer;
  await createServerSlideshow(page);

  await chooseShareRow(page, /^Link teilen/);
  const sheet = page.getByRole("dialog", { name: "Per Link teilen" });
  await sheet.getByRole("button", { name: "Link erstellen" }).click();
  const link = sheet.getByRole("status", { name: "Link" });
  await expect(link).toHaveText(/\/s\/[\w-]{22}$/);
  const url = (await link.textContent()) ?? "";
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await expect(
    (await openShare(page)).getByRole("button", { name: /^Per Link geteilt/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Schließen" }).click();

  const recipient = await page.context().newPage();
  server.attachPage(recipient);
  await recipient.goto(url);
  await expect(recipient.locator("html")).toHaveAttribute("data-state", "start");
  await recipient.getByRole("button", { name: "Abspielen" }).click();
  await expect(recipient.locator("html")).toHaveAttribute("data-state", "playing");

  await chooseShareRow(page, /^Per Link geteilt/);
  await sheet.getByRole("button", { name: "Link ausschalten" }).click();
  await page
    .getByRole("dialog", { name: "Link ausschalten?" })
    .getByRole("button", { name: "Link ausschalten" })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "Link ausgeschaltet" })).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Teilen", exact: true }).getByRole("button", {
      name: /^Link teilen/,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Schließen" }).click();

  await recipient.reload();
  await expect(recipient.locator("html")).toHaveAttribute("data-state", "gone");
  await expect(recipient.getByText("Dieser Link funktioniert nicht mehr")).toBeVisible();
  await expect(recipient.getByRole("button", { name: "Abspielen" })).toHaveCount(0);

  await chooseShareRow(page, /^Link teilen/);
  await sheet.getByRole("button", { name: "Link erstellen" }).click();
  await expect(link).toHaveText(/\/s\/[\w-]{22}$/);
  await expect(link).not.toHaveText(url);
  await recipient.reload();
  await expect(recipient.locator("html")).toHaveAttribute("data-state", "gone");
});
