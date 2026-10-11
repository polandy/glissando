import { expect, test } from "@playwright/test";
import {
  chooseFiles,
  choosePictures,
  CREATED_TOAST,
  editsStored,
  GERMAN_BROWSER,
  openImport,
  picturesTakenOn,
} from "./support/app";
import { openApp } from "./support/browser";
import { clickTrackWav } from "./support/media";

test.use(GERMAN_BROWSER);

test("E2E-040 with music the pictures keep their own length on the beat, set in the import and the music editor, or fill the music", async ({
  page,
}) => {
  const track = clickTrackWav("Takt.wav", 60, 120);
  const lengthSection = page.locator('section[aria-labelledby="music-picture-length"]');
  const ownSeconds = (seconds: string) =>
    lengthSection.getByRole("radio", { name: `Je etwa ${seconds}` });
  const fill = lengthSection.getByRole("radio", { name: "Musik füllen" });
  await openApp(page);
  await openImport(page);
  await choosePictures(
    page,
    await picturesTakenOn(page, ["2025-07-12", "2025-07-14", "2025-07-20"]),
    3,
  );
  await page.getByRole("button", { name: "Weiter" }).click();
  await chooseFiles(page, page.getByRole("button", { name: "Musik auswählen" }), [track]);

  await expect(ownSeconds("5 s")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Die Musik blendet mit dem letzten Bild aus.")).toBeVisible();
  await lengthSection.getByRole("button", { name: "Länger" }).click();
  await expect(ownSeconds("5,5 s")).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Diashow erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);

  await page.getByRole("button", { name: "Musik Takt.wav ganzer Titel Bearbeiten" }).click();
  await expect(page.locator('[aria-labelledby="music-picture-changes"] .state')).toHaveText(
    "120 BPM",
  );
  await expect(ownSeconds("5,5 s")).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByText(
      "Jedes Bild ohne eigene Dauer bleibt etwa 5,5 s, jeder Wechsel auf dem nächsten Schlag.",
      { exact: false },
    ),
  ).toBeVisible();

  await fill.click();
  await expect(fill).toHaveAttribute("aria-checked", "true");
  await expect(lengthSection.getByRole("button", { name: "Länger" })).toBeHidden();
  await editsStored(page);

  await page.reload();
  await expect(fill).toHaveAttribute("aria-checked", "true");
  await expect(ownSeconds("5,5 s")).toHaveAttribute("aria-checked", "false");
});
