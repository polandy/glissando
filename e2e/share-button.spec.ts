import { expect, test } from "@playwright/test";
import { GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { fakeGlissandoServer } from "./support/fake-glissando-server";
import { pictureTakenOn } from "./support/media";
import { openShare } from "./support/share";
import { createServerSlideshow } from "./support/server-slideshow";

test.use(GERMAN_BROWSER);

const ROWS = [
  { row: /^Link teilen/, sheet: "Per Link teilen" },
  { row: /^Video/, sheet: "Video" },
  { row: /^Webseite/, sheet: "Webseite" },
  { row: /^Glissando-Datei/, sheet: "Glissando-Datei" },
] as const;

test("E2E-089 the Share button's chooser opens each row's own sheet, Zurück returns to the chooser, and its Glissando file sheet saves the file", async ({
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

  const chooser = await openShare(page);
  for (const { row, sheet } of ROWS) {
    await chooser.getByRole("button", { name: row }).click();
    const dialog = page.getByRole("dialog", { name: sheet, exact: true });
    await expect(dialog).toBeVisible();
    await expect(chooser).toHaveCount(0);
    await dialog.getByRole("button", { name: "Zurück" }).click();
    await expect(chooser).toBeVisible();
  }

  await chooser.getByRole("button", { name: /^Glissando-Datei/ }).click();
  const fileSheet = page.getByRole("dialog", { name: "Glissando-Datei", exact: true });
  const download = page.waitForEvent("download");
  await fileSheet.getByRole("button", { name: "Datei sichern" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.glissando$/);
  await expect(fileSheet.getByText("In Downloads gesichert.")).toBeVisible();

  await fileSheet.getByRole("button", { name: "Schließen" }).click();
  await expect(fileSheet).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Teilen", exact: true })).toBeFocused();
});
