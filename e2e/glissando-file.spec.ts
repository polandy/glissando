import { expect, test, type Page } from "@playwright/test";
import { exportedFile } from "../src/glissando-file/testing/glissando-fixtures";
import {
  captionPicture,
  chooseFiles,
  createSlideshow,
  definitionOf,
  GERMAN_BROWSER,
  openImport,
} from "./support/app";
import { openApp } from "./support/browser";
import { holdPictureStore } from "./support/hold-pictures";
import { blobFile, textFile } from "./support/media";

test.use(GERMAN_BROWSER);

const TITLE = "Juli 2025";

function status(page: Page, text: string) {
  return page.getByRole("status").filter({ hasText: text });
}

function openingOverlay(page: Page) {
  return page.getByRole("alertdialog", { name: /^Diashow wird geöffnet/ });
}

async function backToLibrary(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Zurück" }).click();
  await expect(page.getByRole("heading", { name: "Deine Diashows" })).toBeVisible();
}

test("E2E-015 a slideshow exported from its menu opens again from the library as a copy", async ({
  page,
}, testInfo) => {
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14"], 2);
  await captionPicture(page, "Bild 1, aufgenommen am 12.07.2025", "Abends am Steg");
  await expect(definitionOf(page, "Bildtitel")).toHaveText("1 von 2");

  await page.getByRole("button", { name: "Mehr" }).click();
  const exportItem = page.getByRole("menuitem", { name: /^Exportieren/ });
  await expect(exportItem).toContainText(/Eine \.glissando-Datei, ca\. [\d,]+ MB/);
  const releaseExport = await holdPictureStore(page);
  await exportItem.click();
  await expect(status(page, `Exportiere „${TITLE}“`)).toBeVisible();
  const download = page.waitForEvent("download");
  await releaseExport();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`${TITLE}.glissando`);
  await expect(status(page, `„${TITLE}.glissando“ heruntergeladen`)).toBeVisible();
  const saved = testInfo.outputPath(file.suggestedFilename());
  await file.saveAs(saved);

  await backToLibrary(page);
  const releaseOpening = await holdPictureStore(page);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Datei öffnen" }).click();
  await (await chooser).setFiles(saved);
  await expect(openingOverlay(page)).toHaveAttribute("aria-busy", "true");
  await releaseOpening();

  await expect(page.getByRole("heading", { name: `${TITLE} (2)` })).toBeVisible();
  await expect(
    status(page, `Geöffnet als „${TITLE} (2)“, „${TITLE}“ bleibt unverändert.`),
  ).toBeVisible();
  await expect(openingOverlay(page)).toHaveCount(0);
  await expect(definitionOf(page, "Bildtitel")).toHaveText("1 von 2");
});

test("E2E-016 a file that is no .glissando file is refused in the library and stores nothing", async ({
  page,
}) => {
  await openApp(page);
  await createSlideshow(page, ["2025-07-12"], 2);
  await backToLibrary(page);

  await chooseFiles(page, page.getByRole("button", { name: "Datei öffnen" }), [
    textFile("urlaub.zip"),
  ]);

  const notice = page.getByRole("alert");
  await expect(notice).toContainText("„urlaub.zip“ ist keine Glissando-Diashow.");
  await expect(notice.getByRole("button", { name: "Andere Datei wählen" })).toBeVisible();
  await expect(notice.getByRole("button", { name: "Neue Diashow" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(TITLE) })).toHaveCount(1);
});

test("E2E-017 step 1 of a new slideshow opens a .glissando file from another device", async ({
  page,
}) => {
  const glissando = await blobFile("Herbst in Wien.glissando", await exportedFile());
  await openApp(page);
  await openImport(page);

  const box = page.getByText("Diashow von einem anderen Gerät?");
  await expect(box).toBeVisible();
  await chooseFiles(page, page.getByRole("button", { name: "Datei öffnen" }), [glissando]);

  await expect(page.getByRole("heading", { name: "Herbst in Wien" })).toBeVisible();
  await expect(status(page, "„Herbst in Wien“ geöffnet")).toBeVisible();
});

test("E2E-024 a .glissando file double-clicked on the desktop opens in the installed app", async ({
  page,
}) => {
  const bytes = [...new Uint8Array(await (await exportedFile()).arrayBuffer())];
  // The operating system's hand-over: Chromium's Launch Queue with the double-clicked file.
  await page.addInitScript(
    ({ name, bytes }) => {
      const launched = { getFile: () => Promise.resolve(new File([new Uint8Array(bytes)], name)) };
      Object.defineProperty(window, "launchQueue", {
        value: {
          setConsumer: (consumer: (params: object) => void) => consumer({ files: [launched] }),
        },
      });
    },
    { name: "Herbst in Wien.glissando", bytes },
  );
  await openApp(page);

  await expect(page.getByRole("heading", { name: "Herbst in Wien" })).toBeVisible();
  await expect(status(page, "„Herbst in Wien“ geöffnet")).toBeVisible();
});
