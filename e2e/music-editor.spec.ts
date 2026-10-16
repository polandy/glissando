import { expect, test } from "@playwright/test";
import { createSlideshowWithMusic, editsStored, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { silentTrack } from "./support/media";

test.use(GERMAN_BROWSER);

const TRACK_SECONDS = 20;

test("E2E-023 the music gets its own excerpt and fade-in, stored, summed up in the music row, and goes back to the whole track", async ({
  page,
}) => {
  const excerpt = page.locator('section[aria-labelledby="music-excerpt"]');
  const excerptState = excerpt.locator(".state");
  const startValue = excerpt.locator("output.mono").first();
  const endValue = excerpt.locator("output.mono").last();
  const startLater = excerpt.getByRole("button", { name: "Anfang eine halbe Sekunde später" });
  const endHandle = page.getByRole("slider", { name: "Ende" });
  const fadeIn = page.locator('section[aria-labelledby="music-fade-in"]');
  const fadeOut = page.locator('section[aria-labelledby="music-fade-out"]');
  const longFadeIn = fadeIn.getByRole("radio", { name: /^Lang/ });
  const back = page.getByRole("button", { name: "Zurück", exact: true });
  await openApp(page);
  await createSlideshowWithMusic(page, silentTrack("Sommerwind.wav", TRACK_SECONDS), {
    fill: true,
  });

  await page.getByRole("button", { name: "Musik Sommerwind.wav ganzer Titel Bearbeiten" }).click();
  await expect(
    page.getByRole("navigation", { name: "Navigationspfad" }).locator('[aria-current="page"]'),
  ).toHaveText("Musik");
  await expect(excerptState).toHaveText("Ganzer Titel");
  await expect(excerpt.getByText("Die Diashow nutzt den ganzen Titel, 0:20.")).toBeVisible();
  await expect(fadeIn.locator(".state")).toHaveText("Automatisch");

  await startLater.click();
  await expect(startValue).toHaveText("0:00,5");
  await startLater.click();
  await expect(startValue).toHaveText("0:01,0");
  await expect(excerptState).toHaveText("Gekürzt");

  // The handle steps a second per Shift+arrow, as a slider does.
  await endHandle.focus();
  await endHandle.press("Shift+ArrowLeft");
  await expect(endHandle).toHaveAttribute("aria-valuenow", "19000");
  await endHandle.press("Shift+ArrowLeft");
  await expect(endHandle).toHaveAttribute("aria-valuenow", "18000");
  await endHandle.press("Shift+ArrowLeft");
  await expect(endHandle).toHaveAttribute("aria-valuenow", "17000");
  await expect(endValue).toHaveText("0:17,0");
  await expect(
    page.getByRole("list", { name: "Songs" }).getByText("0:20 · gekürzt auf 0:16"),
  ).toBeVisible();

  await longFadeIn.click();
  await expect(longFadeIn).toHaveAttribute("aria-checked", "true");
  await expect(fadeIn.locator(".state")).toHaveText("Eigene");
  await expect(fadeOut.locator(".state")).toHaveText("Automatisch");
  await expect(
    fadeOut.getByText("Automatisch: kurz, weil der Ausschnitt vor dem Titelende aufhört."),
  ).toBeVisible();
  await editsStored(page);

  await page.reload();
  await expect(excerptState).toHaveText("Gekürzt");
  await expect(startValue).toHaveText("0:01,0");
  await expect(endValue).toHaveText("0:17,0");
  await expect(longFadeIn).toHaveAttribute("aria-checked", "true");
  await expect(fadeIn.locator(".state")).toHaveText("Eigene");

  await back.click();
  const trimmedRow = page.getByRole("button", {
    name: "Musik Sommerwind.wav 0:01–0:17 · blendet ein und aus Bearbeiten",
  });
  await expect(trimmedRow).toBeVisible();

  await trimmedRow.click();
  await expect(excerptState).toHaveText("Gekürzt");
  await excerpt.getByRole("button", { name: "Ganzer Titel" }).click();
  await expect(excerptState).toHaveText("Ganzer Titel");
  await expect(startValue).toHaveText("0:00,0");
  await expect(endValue).toHaveText("0:20,0");
  await expect(fadeIn.locator(".state")).toHaveText("Eigene");
  await editsStored(page);

  await back.click();
  await expect(
    page.getByRole("button", { name: "Musik Sommerwind.wav blendet ein Bearbeiten" }),
  ).toBeVisible();
});

/** Parses a `formatTenths` time such as "0:01,5" into seconds. */
function tenthsToSeconds(formatted: string): number {
  const match = /^(\d+):(\d{2}),(\d)$/.exec(formatted);
  if (match === null) {
    throw new Error(`not a formatTenths time: "${formatted}"`);
  }
  const [, minutes, seconds, tenth] = match;
  return Number(minutes) * 60 + Number(seconds) + Number(tenth) / 10;
}

test("E2E-061 listening to the excerpt draws one playhead through both lanes with a time chip and lights the current picture, gone once paused", async ({
  page,
}) => {
  const excerpt = page.locator('section[aria-labelledby="music-excerpt"]');
  const startLater = excerpt.getByRole("button", { name: "Anfang eine halbe Sekunde später" });
  const lane = page.locator(".lane");
  const playhead = page.locator(".tracks .playhead");
  const chip = page.locator(".chip");
  const current = lane.locator(".current");
  const listenStart = page.getByRole("button", { name: /^Anfang anhören/ });

  await openApp(page);
  await createSlideshowWithMusic(page, silentTrack("Sommerwind.wav", TRACK_SECONDS), {
    fill: true,
  });
  await page.getByRole("button", { name: "Musik Sommerwind.wav ganzer Titel Bearbeiten" }).click();

  // A non-zero excerpt start, so the chip's time at the start of a listen is meaningfully
  // compared against it rather than trivially 0.
  await startLater.click();
  await expect(listenStart).toHaveText(/ab 0:00,5/);

  await expect(lane).toBeVisible();
  await expect(playhead).toBeHidden();
  await expect(chip).toBeHidden();
  await expect(current).toBeHidden();

  await listenStart.click();
  await expect(listenStart).toHaveAttribute("aria-pressed", "true");

  await expect(playhead).toBeVisible();
  await expect(chip).toBeVisible();
  await expect(current).toBeVisible();

  const laneBox = await lane.boundingBox();
  await expect
    .poll(async () => {
      const head = await playhead.boundingBox();
      return head !== null && laneBox !== null
        ? head.y < laneBox.y && head.y + head.height > laneBox.y + laneBox.height
        : false;
    })
    .toBe(true);

  const chipSeconds = tenthsToSeconds((await chip.textContent()) ?? "");
  expect(chipSeconds).toBeGreaterThanOrEqual(0.5);

  await listenStart.click();
  await expect(listenStart).toHaveAttribute("aria-pressed", "false");
  await expect(playhead).toBeHidden();
  await expect(chip).toBeHidden();
  await expect(current).toBeHidden();
  await expect(lane).toBeVisible();
});
