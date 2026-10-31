import { expect, test, type Page } from "@playwright/test";
import { captionPicture, chooseFiles, createSlideshow, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { holdPictureStore } from "./support/hold-pictures";
import { textFile } from "./support/media";
import { exportedFileWithRealMedia } from "./support/real-glissando-file";
import { chooseShareRow } from "./support/share";

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

test("E2E-015 a slideshow exported from its Share sheet opens again from the library as a copy", async ({
  page,
}, testInfo) => {
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14"], 2);
  await captionPicture(page, "Bild 1, aufgenommen am 12.07.2025", "Abends am Steg");

  await chooseShareRow(page, /^Glissando-Datei/);
  const sheet = page.getByRole("dialog", { name: "Glissando-Datei" });
  await expect(sheet).toContainText(/\.glissando/);
  await expect(sheet).toContainText(/[\d,]+ MB/);
  const releaseExport = await holdPictureStore(page);
  await sheet.getByRole("button", { name: "Datei sichern" }).click();
  await expect(status(page, `Speichere „${TITLE}“`)).toBeVisible();
  const download = page.waitForEvent("download");
  await releaseExport();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`${TITLE}.glissando`);
  await expect(status(page, `„${TITLE}.glissando“ heruntergeladen`)).toBeVisible();
  const saved = testInfo.outputPath(file.suggestedFilename());
  await file.saveAs(saved);
  await expect(sheet).toContainText("In Downloads gesichert.");
  await sheet.getByRole("button", { name: "Fertig" }).click();

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

test("E2E-017 the start screen opens a .glissando file from another device", async ({ page }) => {
  const glissando = await exportedFileWithRealMedia();
  await openApp(page);
  await chooseFiles(page, page.getByRole("button", { name: "Datei öffnen" }), [glissando]);

  await expect(page.getByRole("heading", { name: "Herbst in Wien" })).toBeVisible();
  await expect(status(page, "„Herbst in Wien“ geöffnet")).toBeVisible();
});

test("E2E-024 a .glissando file double-clicked on the desktop opens in the installed app", async ({
  page,
}) => {
  const bytes = [...(await exportedFileWithRealMedia()).buffer];
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
