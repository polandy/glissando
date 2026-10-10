import { expect, test, type Locator, type Page } from "@playwright/test";
import { CREATED_TOAST, GERMAN_BROWSER, openImport } from "./support/app";
import { openApp } from "./support/browser";
import { fakeGlissandoServer, LIBRARY_PAGE } from "./support/fake-glissando-server";
import { pictureTakenOn } from "./support/media";

test.use(GERMAN_BROWSER);

const SERVER_TITLE = "Sommer auf dem Server";
const SERVER_TITLE_CARD = { name: new RegExp(SERVER_TITLE) };
const SLIDESHOW_URL = /\/api\/library\/slideshows\/[^/]+$/;

function serverSection(page: Page): Locator {
  return page.getByRole("region", { name: "Auf deinem Glissando-Server" });
}

test("E2E-034 a slideshow created on the Glissando server links its Immich photos, is edited there, copied to this device and shows a photo deleted in Immich as missing", async ({
  page,
}) => {
  let jpeg: Uint8Array | null = null;
  const server = await fakeGlissandoServer(page, () => {
    if (jpeg === null) throw new Error("a photo was asked for before the case made one");
    return jpeg;
  });
  await openApp(page);
  jpeg = (await pictureTakenOn(page, "photo.jpg", "2019-07-02", "#4db6ac")).buffer;

  await expect(serverSection(page)).toBeVisible();
  await expect(page.getByText("Noch nichts auf diesem Gerät.")).toBeVisible();

  await openImport(page);
  await expect(page.getByText("Wo soll sie liegen?")).toBeVisible();
  await page.getByRole("button", { name: /^Glissando-Server/ }).click();
  await page.getByRole("button", { name: "Immich öffnen" }).click();
  for (const { originalFileName } of LIBRARY_PAGE.assets.items) {
    await page.getByRole("button", { name: originalFileName, exact: true }).click();
  }
  const footer = page.locator(".actions");
  await footer.getByRole("button", { name: "3 hinzufügen" }).click();
  await expect(page.getByText("3 Bilder", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Aus Immich verknüpft\./)).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();

  await expect(page.getByRole("status").filter({ hasText: CREATED_TOAST })).toBeVisible();
  await expect(page.getByText("Auf deinem Glissando-Server", { exact: true })).toBeVisible();
  expect(server.slideshows).toHaveLength(1);
  expect(server.slideshows[0]?.document.slideshow.pictures).toHaveLength(3);
  expect(server.originalsAsked).toEqual([]);

  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  const serverCards = serverSection(page).getByRole("button", { name: /Server/ });
  await expect(serverCards).toHaveCount(1);
  await serverCards.first().click();

  await page.getByRole("button", { name: "Titel umbenennen" }).click();
  await page.getByRole("textbox", { name: "Titel" }).fill(SERVER_TITLE);
  const saved = page.waitForResponse(
    (response) => response.request().method() === "PUT" && SLIDESHOW_URL.test(response.url()),
  );
  await page.getByRole("textbox", { name: "Titel" }).press("Enter");
  await saved;
  await expect(page.getByRole("heading", { name: SERVER_TITLE })).toBeVisible();
  await expect(page.getByText("Gespeichert", { exact: true })).toBeVisible();
  expect(server.slideshows[0]?.revision).toBe(2);
  expect(server.slideshows[0]?.document.slideshow.title).toBe(SERVER_TITLE);

  await page.getByRole("button", { name: "Mehr" }).click();
  await page.getByRole("menuitem", { name: /Kopie auf diesem Gerät behalten/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Herunterladen und behalten" })
    .click();
  // Bounded by the test's timeout only: the copy decodes each original on the device, as fast
  // as the CI image's load allows.
  await expect(
    page.getByRole("status").filter({ hasText: "Auf dieses Gerät kopiert" }),
  ).toBeVisible({ timeout: 0 });

  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  // The copy is the card outside the server's section.
  await expect(serverSection(page).getByRole("button", SERVER_TITLE_CARD)).toHaveCount(1);
  await expect(page.getByRole("main").getByRole("button", SERVER_TITLE_CARD)).toHaveCount(2);
  await expect(page.getByText("Noch nichts auf diesem Gerät.")).toHaveCount(0);

  const deleted = LIBRARY_PAGE.assets.items[2];
  if (deleted === undefined) throw new Error("the recorded page has three photos");
  server.goneFromImmich.add(deleted.id);
  await page.reload();
  await serverSection(page).getByRole("button", SERVER_TITLE_CARD).click();
  await expect(page.getByText("Nicht mehr in Immich", { exact: true })).toBeVisible();
  await expect(
    page.getByText("1 Bild ist nicht mehr in Immich. Es wird beim Abspielen übersprungen."),
  ).toBeVisible();
});
