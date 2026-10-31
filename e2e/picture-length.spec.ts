import { expect, test } from "@playwright/test";
import {
  chooseFiles,
  choosePictures,
  createSlideshow,
  CREATED_TOAST,
  editsStored,
  GERMAN_BROWSER,
  openImport,
  picturesTakenOn,
} from "./support/app";
import { openApp } from "./support/browser";
import { clickTrackWav } from "./support/media";

test.use(GERMAN_BROWSER);

test("E2E-040 with music the pictures keep the mood's length on the beat until the music editor sets its own, or fills the music", async ({
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
  await chooseFiles(page, page.getByRole("button", { name: "Dateien wählen" }), [track]);

  // Every new slideshow starts on Calm (ADR-0050): its 3 pictures at 7 s each (21 s) are shorter
  // than the 60 s track, so it fades out with the last one.
  await expect(page.getByText("Die Musik blendet mit dem letzten Bild aus.")).toBeVisible();
  await page.getByRole("button", { name: "Diashow erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);

  await page.getByRole("button", { name: /^Musik Takt\.wav/ }).click();
  await expect(page.locator('[aria-labelledby="music-picture-changes"] .state')).toHaveText(
    "120 Schläge pro Minute",
  );
  // Calm still sets the picture length, so "Selbst festlegen" is the only control here (ADR-0045).
  await expect(lengthSection.getByRole("button", { name: "Selbst festlegen" })).toBeVisible();
  await lengthSection.getByRole("button", { name: "Selbst festlegen" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Keine Stimmung ist an" })).toBeVisible();

  await expect(ownSeconds("7 s")).toHaveAttribute("aria-checked", "true");
  await lengthSection.getByRole("button", { name: "Länger" }).click();
  await expect(ownSeconds("7,5 s")).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByText(
      "Jedes Bild ohne eigene Dauer bleibt etwa 7,5 s, jeder Wechsel auf dem nächsten Schlag.",
      { exact: false },
    ),
  ).toBeVisible();
  await editsStored(page);

  await fill.click();
  await expect(fill).toHaveAttribute("aria-checked", "true");
  await expect(lengthSection.getByRole("button", { name: "Länger" })).toBeHidden();
  await editsStored(page);

  await page.reload();
  await expect(fill).toHaveAttribute("aria-checked", "true");
  await expect(ownSeconds("7,5 s")).toHaveAttribute("aria-checked", "false");
});

test("E2E-085 without music the music editor sets the picture length below its empty state", async ({
  page,
}) => {
  const lengthSection = page.locator('section[aria-labelledby="music-picture-length"]');
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"]);

  await page.getByRole("button", { name: "Musik Keine Musik hinzufügen" }).click();
  await expect(page.getByText("Noch keine Musik")).toBeVisible();
  // Every new slideshow starts on Calm (ADR-0050); without music there are no beats to count.
  await expect(lengthSection).toContainText(
    "Die Bilddauer wird durch die Stimmung Ruhig festgelegt — ~7 s",
  );

  await lengthSection.getByRole("button", { name: "Selbst festlegen" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Keine Stimmung ist an" })).toBeVisible();
  await expect(lengthSection).toContainText("Je etwa 7 s");
  // Nothing to fill without music: the stepper alone, no choice.
  await expect(lengthSection.getByRole("radio")).toHaveCount(0);

  await lengthSection.getByRole("button", { name: "Länger" }).click();
  await expect(lengthSection).toContainText("Je etwa 7,5 s");
  await editsStored(page);

  await page.reload();
  await expect(lengthSection).toContainText("Je etwa 7,5 s");
});
