import { expect, type Locator, test } from "@playwright/test";
import {
  chooseCustomMood,
  createSlideshowWithMusic,
  editsStored,
  GERMAN_BROWSER,
} from "./support/app";
import { openApp } from "./support/browser";
import { silentTrack } from "./support/media";
import { clickSwitch, showMusicDetails } from "./support/switch";

/** The reference phone, a Pixel 9 Pro, in CSS pixels. */
const PHONE = { width: 412, height: 915 };

test.use({ ...GERMAN_BROWSER, viewport: PHONE });

// 3 pictures at the default 5 s each (createSlideshowWithMusic without `fill`) last 15 s; a
// shorter excerpt either squeezes them down to end with it (down to ⅔ of 5 s, so ≥ 10 s) or,
// below that, leaves them outlasting it (ADR-0047). The track is the whole-track "fitted" length
// itself, so going back to it is one click on "Ganzer Song" rather than more stepping.
const TRACK_SECONDS = 12;
const OUTLASTS_END_MS = 8000;
const FITTED_END_MS = TRACK_SECONDS * 1000;
const STEPS_TO_OUTLASTS = (TRACK_SECONDS * 1000 - OUTLASTS_END_MS) / 1000;

/**
 * Steps the focused "Ende" handle `steps` times, a second at a time, in one round trip: a
 * Playwright `.press()` per step is too slow under CI load for several of them, and the handle's
 * keydown handler reacts to the dispatched `KeyboardEvent` the same way.
 */
async function stepEndHandle(endHandle: Locator, steps: number): Promise<void> {
  await endHandle.evaluate((element, count) => {
    for (let step = 0; step < count; step += 1) {
      element.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", shiftKey: true, bubbles: true }),
      );
    }
  }, steps);
}

test("E2E-081 the music editor notes a shorter music that outlasts or fits the pictures, offers to repeat it, and keeps the choice", async ({
  page,
}) => {
  const endHandle = page.getByRole("slider", { name: "Ende" });
  const outlastsNote = page.getByText("Die Musik endet 0:07 vor den Bildern");
  const fittedNote = page.getByText("Auf je 4,0 s gekürzt, damit die Bilder mit der Musik enden");
  const repeatButton = page.getByRole("button", { name: "Musik wiederholen", exact: true });
  const panelSwitch = page.getByRole("switch", { name: "Musik wiederholen" });
  const laneRepeats = page.getByText("die Musik wiederholt sich und blendet am Ende aus");

  await openApp(page);
  await createSlideshowWithMusic(page, silentTrack("Nachtlicht.wav", TRACK_SECONDS));
  // A new slideshow opens on Calm (ADR-0050); this case is
  // about the music fit against the pictures' own pace, so it switches back to Custom.
  await chooseCustomMood(page);
  // The Music tile is never folded away (ADR-0048).
  await page.getByRole("button", { name: /^Musik Nachtlicht\.wav/ }).click();
  await showMusicDetails(page);

  // Shift+arrow steps the handle a second at a time (as in TrimSection), down to an excerpt the
  // 3 pictures, even squeezed, cannot end with: they keep their 5 s each and outlast it by 7 s.
  await endHandle.focus();
  await stepEndHandle(endHandle, STEPS_TO_OUTLASTS);
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

  // Back to the whole track (still short of the pictures' own 15 s) lets them shrink evenly to
  // end with it instead: 12 s over 3 pictures is 4.0 s each.
  await page.getByRole("button", { name: "Ganzer Song" }).click();
  await expect(endHandle).toHaveAttribute("aria-valuenow", String(FITTED_END_MS));
  await expect(outlastsNote).toHaveCount(0);
  await expect(fittedNote).toBeVisible();
  await editsStored(page);
});
