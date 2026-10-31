import { expect, test, type Page } from "@playwright/test";
import { SERVER_DOCUMENT_FORMAT_VERSION } from "../src/server-library/server-document";
import { GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { fakeGlissandoServer, LIBRARY_PAGE } from "./support/fake-glissando-server";
import { pictureTakenOn } from "./support/media";

test.use(GERMAN_BROWSER);

const TITLE = "Sommer auf dem Server";
const QUALITY_GROUP = "Bildqualität von Server-Diashows";

async function serverShowOnTheServer(page: Page) {
  let jpeg: Uint8Array | null = null;
  const server = await fakeGlissandoServer(page, () => {
    if (jpeg === null) throw new Error("a photo was asked for before the case made one");
    return jpeg;
  });
  server.slideshows.push({
    id: "server-show",
    revision: 1,
    share: null,
    focus: new Map(),
    document: {
      format: "glissando-server",
      formatVersion: SERVER_DOCUMENT_FORMAT_VERSION,
      slideshow: {
        title: TITLE,
        createdAt: "2025-07-01T10:00:00Z",
        secondsPerPicture: 4,
        songs: [],
        pictures: LIBRARY_PAGE.assets.items.map((asset) => ({
          capturedAt: "2025-07-01T10:00:00.000Z",
          width: 2048,
          height: 1365,
          fileName: asset.originalFileName,
          immichAssetId: asset.id,
          colours: { veil: "#404040", accent: "#C0C0C0" },
        })),
      },
    },
  });
  jpeg = (await pictureTakenOn(page, "photo.jpg", "2019-07-02", "#4db6ac")).buffer;
  await openApp(page);
  return server;
}

async function chooseQuality(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Einstellungen" }).click();
  const group = page.getByRole("dialog", { name: "Einstellungen" }).getByRole("radiogroup", {
    name: QUALITY_GROUP,
  });
  await group.getByRole("radio", { name, exact: true }).check();
  await page.keyboard.press("Escape");
}

async function playTheServerShow(page: Page): Promise<void> {
  await page
    .getByRole("region", { name: "Auf deinem Glissando-Server" })
    .getByRole("button", { name: new RegExp(TITLE) })
    .click();
  await page.getByRole("button", { name: "Abspielen", exact: true }).last().click();
}

test("E2E-046 a server slideshow plays Immich's previews at Standard (1440) and prepares the originals at Large (4K)", async ({
  page,
}) => {
  const server = await serverShowOnTheServer(page);

  await chooseQuality(page, "Standard");
  await playTheServerShow(page);
  await expect(page.getByRole("dialog", { name: TITLE })).toBeVisible();
  await expect.poll(() => server.previewsAsked.length).toBeGreaterThan(0);
  expect(server.originalsAsked).toEqual([]);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await chooseQuality(page, "Groß");
  await playTheServerShow(page);
  await expect(page.getByRole("dialog", { name: TITLE })).toBeVisible();
  await expect.poll(() => server.originalsAsked.length).toBeGreaterThan(0);
});
