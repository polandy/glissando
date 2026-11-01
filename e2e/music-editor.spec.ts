import { expect, test } from "@playwright/test";
import {
  chooseFiles,
  choosePictures,
  expectSlideshowScreen,
  createSlideshowWithMusic,
  editsStored,
  GERMAN_BROWSER,
  openImport,
  picturesTakenOn,
} from "./support/app";
import { openApp } from "./support/browser";
import { silentTrack } from "./support/media";
import { clickSwitch } from "./support/switch";

test.use(GERMAN_BROWSER);

const TRACK_SECONDS = 20;

test("E2E-023 the music gets its own excerpt and fade-in, stored, and goes back to the whole track", async ({
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

  await page.getByRole("button", { name: /^Musik Sommerwind\.wav/ }).click();
  await expect(
    page.getByRole("navigation", { name: "Navigationspfad" }).locator('[aria-current="page"]'),
  ).toHaveText("Musik");
  await expect(excerptState).toHaveText("Ganzer Song");
  await expect(excerpt.getByText("Die Diashow nutzt den ganzen Song, 0:20.")).toBeVisible();
  await expect(fadeIn.locator(".state")).toHaveText("Automatisch");

  await startLater.click();
  await expect(startValue).toHaveText("0:00,5");
  await startLater.click();
  await expect(startValue).toHaveText("0:01,0");
  await expect(excerptState).toHaveText("Ausschnitt");

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
  await expect(fadeIn.locator(".state")).toHaveText("Gewählt");
  await expect(fadeOut.locator(".state")).toHaveText("Automatisch");
  await expect(
    fadeOut.getByText("Automatisch: lang, weil der Ausschnitt vor dem Songende aufhört."),
  ).toBeVisible();
  await editsStored(page);

  await page.reload();
  await expect(excerptState).toHaveText("Ausschnitt");
  await expect(startValue).toHaveText("0:01,0");
  await expect(endValue).toHaveText("0:17,0");
  await expect(longFadeIn).toHaveAttribute("aria-checked", "true");
  await expect(fadeIn.locator(".state")).toHaveText("Gewählt");

  await back.click();
  const musicTile = page.getByRole("button", { name: /^Musik Sommerwind\.wav/ });
  await expect(musicTile).toBeVisible();

  await musicTile.click();
  await expect(excerptState).toHaveText("Ausschnitt");
  await excerpt.getByRole("button", { name: "Ganzer Song" }).click();
  await expect(excerptState).toHaveText("Ganzer Song");
  await expect(startValue).toHaveText("0:00,0");
  await expect(endValue).toHaveText("0:20,0");
  await expect(fadeIn.locator(".state")).toHaveText("Gewählt");
  await editsStored(page);

  await back.click();
  await expect(page.getByRole("button", { name: /^Musik Sommerwind\.wav/ })).toBeVisible();
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
  await page.getByRole("button", { name: /^Musik Sommerwind\.wav/ }).click();
  // The slideshow lane under the waveform is one of the details; the switch's input is visually
  // hidden behind its track, so its label is clicked.
  await page
    .locator(".switch")
    .filter({ has: page.getByRole("switch", { name: "Details" }) })
    .click();

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

test("E2E-073 a song's own volume shows Own with its dB and the song-list badge, stored, and back to levelled", async ({
  page,
}) => {
  const volume = page.locator('section[aria-labelledby="music-volume"]');
  const state = volume.locator(".state");
  const sub = volume.locator(".sub");
  const readout = volume.locator(".readout b");
  const slider = page.getByRole("slider", { name: "Lautstärke" });
  const reset = page.getByRole("button", { name: "Zurück auf Automatisch" });
  const badge = page.getByRole("list", { name: "Songs" }).locator(".badge");

  await openApp(page);
  await createSlideshowWithMusic(page, silentTrack("Sommerwind.wav", TRACK_SECONDS), {
    fill: true,
  });
  await page.getByRole("button", { name: /^Musik Sommerwind\.wav/ }).click();

  // The loudness pass measures the song in the background; the badge drops its pulsing
  // "Measuring…" once the song's blocks are stored — a positive signal, no sleep. A silent
  // track can measure before this first check runs, so the state before is not asserted.
  await expect(badge).not.toHaveClass(/measuring/);
  await expect(state).toHaveText("Gleich laut wie die anderen Songs");
  await expect(sub).toHaveText("Gleich laut wie die anderen Songs");
  await expect(reset).toHaveCount(0);

  await slider.focus();
  await slider.press("ArrowUp");
  await slider.press("ArrowUp");
  await slider.press("ArrowUp");
  await expect(slider).toHaveValue("3");
  await expect(state).toHaveText("Gewählt");
  await expect(readout).toHaveText("+3 dB");
  await expect(sub).toHaveText("Lauter als die anderen Songs");
  await expect(reset).toBeVisible();
  await expect(badge).toHaveText("+3 dB");
  await editsStored(page);

  await page.reload();
  await expect(slider).toHaveValue("3");
  await expect(state).toHaveText("Gewählt");
  await expect(badge).toHaveText("+3 dB");

  await reset.click();
  await expect(state).toHaveText("Gleich laut wie die anderen Songs");
  await expect(sub).toHaveText("Gleich laut wie die anderen Songs");
  await expect(slider).toHaveValue("0");
  await expect(reset).toHaveCount(0);
  await expect(badge).toBeEmpty();
  await editsStored(page);
});

test("E2E-095 the music editor opens simple, and its Details switch shows the volume line, slideshow lane and crossfade hatching, still on after a reload", async ({
  page,
}) => {
  const details = page.getByRole("switch", { name: "Details" });
  const endHandle = page.getByRole("slider", { name: "Ende" });
  const blocks = page.locator(".playlist-lane .block");
  const volumeLine = page.locator(".wavebox .envelope");
  const slideshowLane = page.locator(".wavebox .runs");
  const hatching = page.locator(".playlist-lane .crossfade");
  await openApp(page);
  await openImport(page);
  await choosePictures(
    page,
    await picturesTakenOn(page, ["2025-07-12", "2025-07-14", "2025-07-20"]),
    3,
  );
  await page.getByRole("button", { name: "Weiter" }).click();
  await chooseFiles(page, page.getByRole("button", { name: "Dateien wählen" }), [
    silentTrack("Morgenlied.wav", 8),
    silentTrack("Abendlied.wav", 6),
  ]);
  await page.getByRole("button", { name: "Diashow erstellen" }).click();
  await expectSlideshowScreen(page);
  await page.getByRole("button", { name: "Musik 2 Songs" }).click();

  // The waveform's handles and both songs' blocks are there before the details are found absent.
  await expect(endHandle).toBeVisible();
  await expect(blocks).toHaveCount(2);
  await expect(details).not.toBeChecked();
  await expect(volumeLine).toHaveCount(0);
  await expect(slideshowLane).toHaveCount(0);
  await expect(hatching).toHaveCount(0);

  await clickSwitch(details);
  await expect(details).toBeChecked();
  await expect(volumeLine).toHaveCount(1);
  await expect(slideshowLane).toHaveCount(1);
  await expect(hatching).toHaveCount(1);

  await page.reload();
  await expect(details).toBeChecked();
  await expect(volumeLine).toHaveCount(1);
  await expect(slideshowLane).toHaveCount(1);
  await expect(hatching).toHaveCount(1);
});
