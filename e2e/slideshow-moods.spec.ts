import { expect, test, type Page } from "@playwright/test";
import { chooseFiles, definitionOf, editsStored, picturesTakenOn } from "./support/app";
import { openApp } from "./support/browser";
import { clickTrackWav } from "./support/media";

// English matches the mood catalogue's own words ("Calm", "Custom", "What it sets" …) this case
// asserts; the shared helpers' German button names are not reused (music-formats.spec.ts).
test.use({ locale: "en-GB" });

const TRACK_BPM = 120;

/**
 * Imports three pictures with a generated click-track song (a steady, known tempo — no personal
 * music) and waits on the created slideshow's screen, English copy throughout.
 */
async function createMoodSlideshow(page: Page): Promise<void> {
  await openApp(page);
  await page.getByRole("button", { name: "New slideshow" }).first().click();
  await chooseFiles(
    page,
    page.getByRole("button", { name: "Choose media" }),
    await picturesTakenOn(page, ["2025-07-12", "2025-07-14", "2025-07-20"]),
  );
  await expect(page.getByText("3 pictures", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Which music?" })).toBeVisible();
  await chooseFiles(page, page.getByRole("button", { name: "Choose files" }), [
    clickTrackWav("Beat.wav", 20, TRACK_BPM),
  ]);
  await expect(page.getByText("Beat.wav", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create slideshow" }).click();
  await expect(page.getByRole("status")).toHaveText("Slideshow created — tap Play");
}

test("E2E-079 picking Calm sets its transitions, Ken Burns and picture times, and leaving it by another transition keeps an undo", async ({
  page,
}) => {
  const moodRow = page.getByRole("button", { name: "Mood Custom default Change" });
  const calmRow = page.getByRole("button", { name: "Mood Calm Change" });
  const transitionsRow = page.getByRole("button", {
    name: "Transitions Crossfade, long by mood Change",
  });
  const sheet = page.getByRole("dialog", { name: "Mood" });
  const customTile = sheet.getByRole("radio", { name: "Custom" });
  const calmTile = sheet.getByRole("radio", { name: "Calm" });
  const badge = sheet.locator(".badge");
  const statePill = sheet.locator(".state");

  await createMoodSlideshow(page);
  await expect(moodRow).toBeVisible();

  // Open Mood → Change: three tiles, Custom checked (the default), the preview's tempo badge
  // settling once the beat analysis catches up.
  await moodRow.click();
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("radio")).toHaveCount(3);
  await expect(customTile).toHaveAttribute("aria-checked", "true");
  await expect(badge).toHaveText(`♪ ${TRACK_BPM} BPM · Custom`);

  // Tap Calm: it checks, the state pill and "What it sets" follow, Done closes.
  await calmTile.click();
  await expect(calmTile).toHaveAttribute("aria-checked", "true");
  await expect(statePill).toHaveText("Calm");
  await expect(badge).toHaveText(`♪ ${TRACK_BPM} BPM · Calm`);
  await expect(definitionOf(sheet, "Transitions")).toHaveText("Crossfade, long");
  await expect(definitionOf(sheet, "Ken Burns")).toHaveText("Gentle");
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(sheet).toBeHidden();

  // The panel now shows Calm, with "by mood" under the rows it sets.
  await expect(calmRow).toBeVisible();
  await expect(transitionsRow).toBeVisible();
  await expect(definitionOf(page, "Picture times")).toContainText("by mood");
  await expect(definitionOf(page, "Ken Burns")).toContainText("by mood");

  // Picking another transition leaves the mood; the toast's Undo brings Calm back.
  await transitionsRow.click();
  const transitionsSheet = page.getByRole("dialog", { name: "Slideshow transitions" });
  const pushTile = transitionsSheet.getByRole("radio", { name: "Push" });
  await expect(transitionsSheet).toBeVisible();
  await pushTile.click();
  await expect(pushTile).toHaveAttribute("aria-checked", "true");
  await transitionsSheet.getByRole("button", { name: "Done" }).click();
  await expect(transitionsSheet).toBeHidden();

  const toast = page.getByRole("status").filter({ hasText: "Mood is now Custom" });
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(calmRow).toBeVisible();
  await editsStored(page);

  // The mood survives a reload: it is stored, not derived.
  await page.reload();
  await expect(calmRow).toBeVisible();
});
