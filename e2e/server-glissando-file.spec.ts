import { expect, test } from "@playwright/test";
import { GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { fakeGlissandoServer } from "./support/fake-glissando-server";
import { pictureTakenOn } from "./support/media";
import { createServerSlideshow } from "./support/server-slideshow";
import { chooseShareRow } from "./support/share";

test.use(GERMAN_BROWSER);

/** Immich's "thumbnail" at a resolution its admin set above the .glissando format's 480-pixel bound. */
const IMMICH_THUMBNAIL_SIZE = { width: 1440, height: 1080 } as const;
const TITLE = "Juli 2019 – Juli 2025";

test("E2E-131 a server slideshow exported as a .glissando file opens again, though Immich's thumbnails are beyond the format's bound", async ({
  page,
}, testInfo) => {
  let jpeg: Uint8Array | null = null;
  await fakeGlissandoServer(page, () => {
    if (jpeg === null) throw new Error("a photo was asked for before the case made one");
    return jpeg;
  });
  await openApp(page);
  jpeg = (await pictureTakenOn(page, "photo.jpg", "2019-07-02", "#4db6ac", IMMICH_THUMBNAIL_SIZE))
    .buffer;
  await createServerSlideshow(page);

  await chooseShareRow(page, /^Glissando-Datei/);
  const sheet = page.getByRole("dialog", { name: "Glissando-Datei" });
  const download = page.waitForEvent("download");
  await sheet.getByRole("button", { name: "Datei sichern" }).click();
  const file = await download;
  const saved = testInfo.outputPath(file.suggestedFilename());
  await file.saveAs(saved);
  await sheet.getByRole("button", { name: "Fertig" }).click();

  await page.getByRole("button", { name: "Bibliothek" }).click();
  await expect(page.getByRole("heading", { name: "Auf diesem Gerät" })).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Datei öffnen" }).click();
  await (await chooser).setFiles(saved);

  await expect(page.getByRole("status").filter({ hasText: `„${TITLE}“ geöffnet` })).toBeVisible();
  await expect(page.getByText(/ist beschädigt/)).toHaveCount(0);
});
