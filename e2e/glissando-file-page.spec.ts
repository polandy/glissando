import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSlideshowWithMusic, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { silentTrack } from "./support/media";
import { unpackGlissandoFile } from "./support/unpack-glissando-file";

test.use(GERMAN_BROWSER);

const TRACK_SECONDS = 6;

test("E2E-071 a .glissando file's index.html, unpacked and opened from file://, asks to choose its folder, refuses one lacking a picture, and plays once the right one is picked", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== "chromium",
    "Firefox fetches glissando.json straight from file://, so it never shows the choose card; " +
      "WebKit's own file:// refusal is not covered here",
  );
  await openApp(page);
  await createSlideshowWithMusic(page, silentTrack("Sommerwind.wav", TRACK_SECONDS));

  await page.getByRole("button", { name: "Mehr" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /^Als Glissando-Datei sichern/ }).click();
  const file = await download;
  const savedZip = testInfo.outputPath(file.suggestedFilename());
  await file.saveAs(savedZip);
  const zip = new Blob([readFileSync(savedZip)]);

  const complete = testInfo.outputPath("complete");
  const written = await unpackGlissandoFile(zip, complete);
  const missingPicture = written.find((name) => name.startsWith("pictures/"));
  if (missingPicture === undefined) throw new Error("the export holds no picture to remove");
  const incomplete = testInfo.outputPath("incomplete");
  await unpackGlissandoFile(zip, incomplete, new Set([missingPicture]));

  const filePage = await page.context().newPage();
  await filePage.goto(`file://${encodeURI(join(complete, "index.html"))}`);
  await expect(
    filePage.getByRole("heading", { name: "Wähle den Ordner dieser Diashow" }),
  ).toBeVisible();

  const picker = filePage.locator('input[type="file"]');
  await picker.setInputFiles(incomplete);
  const problem = filePage.getByRole("alert");
  await expect(problem).toContainText("fehlen Dateien, die die Diashow braucht");
  await expect(problem).toContainText(missingPicture);

  await picker.setInputFiles(complete);
  await expect(filePage.locator("html")).toHaveAttribute("data-state", "start");
  await filePage.getByRole("button", { name: "Abspielen" }).click();
  await expect(filePage.locator("html")).toHaveAttribute("data-state", "playing");
});
