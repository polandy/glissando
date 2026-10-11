import { expect, test } from "@playwright/test";
import { createSlideshowWithMusic, editsStored, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { clickTrackWav } from "./support/media";

test.use(GERMAN_BROWSER);

test("E2E-039 the music editor finds the music's beat, changes the pictures on it, and keeps the choice to share it evenly", async ({
  page,
}) => {
  const section = page.locator('section[aria-labelledby="music-picture-changes"]');
  const onTheBeat = section.getByRole("radio", { name: "Im Takt" });
  const evenly = section.getByRole("radio", { name: "Gleichmäßig" });
  await openApp(page);
  await createSlideshowWithMusic(page, clickTrackWav("Takt.wav", 20, 120));

  await page.getByRole("button", { name: "Musik Takt.wav ganzer Titel Bearbeiten" }).click();
  await expect(section.locator(".state")).toHaveText("120 BPM");
  await expect(onTheBeat).toHaveAttribute("aria-checked", "true");
  await expect(
    section.getByText(
      "Jeder automatische Wechsel landet auf einem Schlag der Musik; ein Übergang dauert ganze Schläge.",
    ),
  ).toBeVisible();

  await evenly.click();
  await expect(evenly).toHaveAttribute("aria-checked", "true");
  await expect(
    section.getByText("Die Bilder teilen sich die Musik gleichmäßig, unabhängig von ihrem Takt."),
  ).toBeVisible();
  await editsStored(page);

  await page.reload();
  await expect(section.locator(".state")).toHaveText("120 BPM");
  await expect(evenly).toHaveAttribute("aria-checked", "true");
  await expect(onTheBeat).toHaveAttribute("aria-checked", "false");
});
