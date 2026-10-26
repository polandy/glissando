import { expect, test } from "@playwright/test";
import { createSlideshowWithMusic, editsStored, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { silentTrack } from "./support/media";
import { clickSwitch } from "./support/switch";

/** The reference phone, a Pixel 9 Pro, in CSS pixels. */
const PHONE = { width: 412, height: 915 };

test.use({ ...GERMAN_BROWSER, viewport: PHONE });

// 3 pictures at the default 5 s each (createSlideshowWithMusic without `fill`) last 15 s; a
// shorter excerpt either squeezes them down to end with it (down to ⅔ of 5 s, so ≥ 10 s) or,
// below that, leaves them outlasting it (ADR-0047).
const TRACK_SECONDS = 20;
const OUTLASTS_END_MS = 8000;
const FITTED_END_MS = 12000;
const STEPS_TO_OUTLASTS = (TRACK_SECONDS * 1000 - OUTLASTS_END_MS) / 1000;
const STEPS_TO_FITTED = (FITTED_END_MS - OUTLASTS_END_MS) / 1000;

test("E2E-081 the music editor notes a shorter music that outlasts or fits the pictures, offers to repeat it, and keeps the choice", async ({
  page,
}) => {
  const endHandle = page.getByRole("slider", { name: "Ende" });
  const outlastsNote = page.getByText("Die Musik endet 0:07 vor den Bildern");
  const fittedNote = page.getByText("Bilder je etwa 4,0 s, damit sie mit der Musik enden.");
  const repeatButton = page.getByRole("button", { name: "Musik wiederholen", exact: true });
  const panelSwitch = page.getByRole("switch", { name: "Musik wiederholen" });
  const laneRepeats = page.getByText("Musik wiederholt · blendet mit dem letzten Bild aus");

  await openApp(page);
  await createSlideshowWithMusic(page, silentTrack("Nachtlicht.wav", TRACK_SECONDS));
  // The info panel's details are folded away below desktop width (E2E-067).
  await page.getByRole("button", { name: "Details" }).click();
  await page.getByRole("button", { name: "Musik Nachtlicht.wav ganzer Titel Bearbeiten" }).click();

  // Shift+arrow steps the handle a second at a time (as in TrimSection), down to an excerpt the
  // 3 pictures, even squeezed, cannot end with: they keep their 5 s each and outlast it by 7 s.
  await endHandle.focus();
  for (let step = 0; step < STEPS_TO_OUTLASTS; step += 1) {
    await endHandle.press("Shift+ArrowLeft");
  }
  await expect(endHandle).toHaveAttribute("aria-valuenow", String(OUTLASTS_END_MS));

  await expect(outlastsNote).toBeVisible();
  await expect(repeatButton).toBeVisible();
  await expect(panelSwitch).not.toBeChecked();
  await editsStored(page);

  await repeatButton.click();
  await expect(panelSwitch).toBeChecked();
  await expect(outlastsNote).toHaveCount(0);
  await expect(laneRepeats).toBeVisible();
  await editsStored(page);

  await page.reload();
  await expect(panelSwitch).toBeChecked();
  await expect(laneRepeats).toBeVisible();

  await clickSwitch(panelSwitch);
  await expect(panelSwitch).not.toBeChecked();
  await expect(outlastsNote).toBeVisible();
  await editsStored(page);

  // A slightly longer excerpt (still short of the pictures' own 15 s) lets them shrink evenly
  // to end with it instead: 12 s over 3 pictures is 4.0 s each.
  await endHandle.focus();
  for (let step = 0; step < STEPS_TO_FITTED; step += 1) {
    await endHandle.press("Shift+ArrowRight");
  }
  await expect(endHandle).toHaveAttribute("aria-valuenow", String(FITTED_END_MS));
  await expect(outlastsNote).toHaveCount(0);
  await expect(fittedNote).toBeVisible();
  await editsStored(page);
});
