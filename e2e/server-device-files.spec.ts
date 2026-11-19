// Spec: docs/dev/server_library/DEVICE_FILES.md
import { expect, test, type Page } from "@playwright/test";
import { chooseFiles, definitionOf, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import {
  fakeGlissandoServer,
  LIBRARY_PAGE,
  type FakeGlissandoServer,
} from "./support/fake-glissando-server";
import { pictureTakenOn } from "./support/media";
import { createServerSlideshow } from "./support/server-slideshow";

test.use(GERMAN_BROWSER);

const SERVER_PICTURES = LIBRARY_PAGE.assets.items.length;
const ANY_TILE = /^Bild \d+, aufgenommen am \d{2}\.\d{2}\.\d{4}(, neu)?$/;

/** A server slideshow on the fake server, its add screen open. */
async function openServerAddScreen(page: Page): Promise<FakeGlissandoServer> {
  let jpeg: Uint8Array | null = null;
  const server = await fakeGlissandoServer(page, () => {
    if (jpeg === null) throw new Error("a photo was asked for before the case made one");
    return jpeg;
  });
  await openApp(page);
  jpeg = (await pictureTakenOn(page, "photo.jpg", "2019-07-02", "#4db6ac")).buffer;
  await createServerSlideshow(page);
  await page.getByRole("button", { name: "Bilder hinzufügen" }).first().click();
  await expect(page.getByRole("heading", { name: "Bilder hinzufügen" })).toBeVisible();
  return server;
}

/** Chooses one file from this device and confirms the copy sheet. */
async function chooseDeviceFileAndConfirm(page: Page): Promise<void> {
  await expect(page.getByText("Bilder von diesem Gerät", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Fügst du sie hinzu, entsteht eine Kopie auf diesem Gerät."),
  ).toBeVisible();
  const local = await pictureTakenOn(page, "from-this-device.jpg", "2019-07-05", "#ffd54f");
  await chooseFiles(page, page.getByRole("button", { name: "Dateien wählen" }), [local]);

  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Kopie auf diesem Gerät anlegen?")).toBeVisible();
  await expect(sheet).toContainText(
    `Glissando lädt die ${String(SERVER_PICTURES)} Bilder aus Immich herunter, fügt deine Datei hinzu`,
  );
  await expect(sheet).toContainText("Die Diashow auf dem Server bleibt, wie sie ist.");
  await sheet.getByRole("button", { name: "Herunterladen und hinzufügen" }).click();
}

test("E2E-150 files from this device for a server slideshow go into a copy on this device after the confirm sheet, and the server slideshow stays as it is", async ({
  page,
}) => {
  const server = await openServerAddScreen(page);
  await chooseDeviceFileAndConfirm(page);

  // Bounded by the test's timeout only: the copy decodes each original on the device.
  const addOne = page.getByRole("button", { name: "1 hinzufügen", exact: true });
  await expect(addOne).toBeEnabled({ timeout: 0 });
  await expect(definitionOf(page, "Bilder")).toHaveText(
    `${String(SERVER_PICTURES)} → ${String(SERVER_PICTURES + 1)}`,
  );
  await expect(page.getByText("Bilder von diesem Gerät", { exact: true })).toHaveCount(0);
  await addOne.click();

  await expect(page.getByRole("status").filter({ hasText: "hinzugefügt" })).toContainText(
    "1 Bild hinzugefügt",
  );
  await expect(page.getByRole("button", { name: ANY_TILE })).toHaveCount(SERVER_PICTURES + 1);
  expect(server.slideshows).toHaveLength(1);
  expect(server.slideshows[0]?.document.slideshow.pictures).toHaveLength(SERVER_PICTURES);

  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await expect(page.getByRole("region", { name: "Auf deinem Glissando-Server" })).toBeVisible();
  await expect(page.getByText("Noch nichts auf diesem Gerät.")).toHaveCount(0);
});

test("E2E-151 a copy for files from this device that meets a picture no longer in Immich keeps nothing and says a picture is no longer in Immich", async ({
  page,
}) => {
  const server = await openServerAddScreen(page);
  const gone = LIBRARY_PAGE.assets.items[1];
  if (gone === undefined) throw new Error("the recorded page has three photos");
  server.goneFromImmich.add(gone.id);
  await chooseDeviceFileAndConfirm(page);

  const failure = page.getByRole("alert");
  await expect(failure).toContainText(
    "Ein Bild ist nicht mehr in Immich. Entferne es, dann klappt die Kopie.",
    { timeout: 0 },
  );
  // Trying again would no longer have the files.
  await expect(failure.getByRole("button", { name: "Erneut" })).toHaveCount(0);
  expect(server.slideshows).toHaveLength(1);
  expect(server.slideshows[0]?.document.slideshow.pictures).toHaveLength(SERVER_PICTURES);

  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await expect(page.getByRole("region", { name: "Auf deinem Glissando-Server" })).toBeVisible();
  await expect(page.getByText("Noch nichts auf diesem Gerät.")).toBeVisible();
});
