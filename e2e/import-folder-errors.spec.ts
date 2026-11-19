// Spec: docs/dev/app/IMPORT_WIZARD.md
import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GERMAN_BROWSER, openImport, picturesTakenOn } from "./support/app";
import { openApp } from "./support/browser";
import { textFile } from "./support/media";

test.use(GERMAN_BROWSER);

test.beforeEach(async ({ page, browserName }) => {
  test.skip(
    browserName !== "chromium",
    "Playwright's folder upload hangs now and then in Firefox and WebKit, and Firefox's carries no MIME type",
  );
  await openApp(page);
});

test("E2E-148 a folder holding a text file and a nested picture takes in its pictures, names the file it skipped and keeps Weiter available", async ({
  page,
}, testInfo) => {
  const [first, second] = await picturesTakenOn(page, ["2025-07-12", "2025-07-14"]);
  if (first === undefined || second === undefined) throw new Error("expected two test pictures");
  const folder = testInfo.outputPath("Urlaub");
  await mkdir(join(folder, "Tag 2"), { recursive: true });
  await writeFile(join(folder, "erstes.jpg"), first.buffer);
  await writeFile(join(folder, "Tag 2", "zweites.jpg"), second.buffer);
  const notes = textFile("notizen.txt");
  await writeFile(join(folder, notes.name), notes.buffer);

  await openImport(page);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "einen Ordner wählen" }).click();
  await (await chooser).setFiles(folder);

  await expect(page.getByText("2 Bilder", { exact: true })).toBeVisible();
  await expect(
    page.getByText("1 Datei konnte nicht als Bild gelesen werden und wurde übersprungen:"),
  ).toBeVisible();
  await expect(page.getByText(/notizen\.txt\./)).toBeVisible();
  await expect(page.getByText("Die anderen 2 Bilder sind drin.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Weiter" })).toBeEnabled();
});

test("E2E-149 a folder holding no picture at all names what it skipped and leaves Weiter disabled", async ({
  page,
}, testInfo) => {
  const folder = testInfo.outputPath("Dokumente");
  await mkdir(folder, { recursive: true });
  for (const name of ["notizen.txt", "liste.txt"]) {
    const file = textFile(name);
    await writeFile(join(folder, file.name), file.buffer);
  }

  await openImport(page);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "einen Ordner wählen" }).click();
  await (await chooser).setFiles(folder);

  await expect(
    page.getByText("2 Dateien konnten nicht als Bild gelesen werden und wurden übersprungen:"),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("liste.txt");
  await expect(page.getByRole("status")).toContainText("notizen.txt");
  await expect(page.getByRole("button", { name: "Bilder auswählen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Weiter" })).toBeDisabled();
});
