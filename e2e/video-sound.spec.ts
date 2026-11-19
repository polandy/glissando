// Spec: docs/dev/player/VIDEO_SLIDES.md
import { expect, test, type Page } from "@playwright/test";
import {
  chooseFiles,
  expectSlideshowScreen,
  GERMAN_BROWSER,
  openImport,
  picturesTakenOn,
} from "./support/app";
import { openApp } from "./support/browser";
import { generatedClip } from "./support/clip";
import { clickTrackWav } from "./support/media";
import { showMusicDetails } from "./support/switch";
import { VIDEO_DUCK_RAMP_DOWN_MS, VIDEO_DUCK_VOLUME } from "../src/player/video-duck";

test.use(GERMAN_BROWSER);

const CLIP_SECONDS = 3;
const CLIP_COLOUR = "#4db6ac";
/** Before the clip, which takes the file's own date, so the picture plays first. */
const PICTURE_DAY = "2025-07-12";
const CLOCK_START = new Date("2026-01-01T12:00:00Z").getTime();
const CLOCK_HOLD_MS = 60_000;
/** One player frame per step of the held page clock; each is a software-rendered WebGL frame. */
const FRAME_MS = 250;
/** 13 s: past the picture (about 7 s on the found beat) and the clip, into the end card. */
const PLAY_FRAMES = 52;
/** At least the clip's own frames are compared. */
const MIN_FRAMES = (CLIP_SECONDS * 1000) / FRAME_MS;
const TRACK_SECONDS = 30;
const BEATS_PER_MINUTE = 120;
/** Gains are products of a few factors, equal to well within this. */
const EPSILON = 1e-6;
const DIGITS = 6;

interface GainProbe {
  /** The music's gain as set, against the page's `performance.now`. */
  log: { at: number; value: number }[];
}

/** Records every gain set on a node a media element (the music, never a clip) is routed to. */
async function probeMusicGain(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: GainProbe = { log: [] };
    Object.assign(window, { musicGainProbe: probe });
    const musicGains = new WeakSet<AudioParam>();
    const connect = AudioNode.prototype.connect as (
      this: AudioNode,
      ...args: unknown[]
    ) => AudioNode | undefined;
    AudioNode.prototype.connect = function (this: AudioNode, ...args: unknown[]) {
      const [destination] = args;
      if (this instanceof MediaElementAudioSourceNode && destination instanceof GainNode) {
        musicGains.add(destination.gain);
      }
      return connect.apply(this, args);
    } as typeof AudioNode.prototype.connect;
    const setValueAtTime = AudioParam.prototype.setValueAtTime;
    AudioParam.prototype.setValueAtTime = function (value, startTime) {
      if (musicGains.has(this)) {
        probe.log.push({ at: performance.now(), value });
      }
      return setValueAtTime.call(this, value, startTime);
    };
  });
}

/**
 * Waits in the music editor until the song's beat and loudness are found: both re-time or
 * re-level the show, so the two runs compared must both come after them.
 */
async function songAnalysed(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Musik Takt\.wav/ }).click();
  await showMusicDetails(page);
  await expect(
    page.getByText(`${BEATS_PER_MINUTE} Schläge pro Minute`, { exact: true }),
  ).toBeVisible();
  const volume = page.locator('section[aria-labelledby="music-volume"]');
  await expect(volume.getByTestId("section-state")).toHaveText("Gleich laut wie die anderen Songs");
  await expect(
    page.getByRole("list", { name: "Songs" }).getByTestId("volume-badge"),
  ).not.toHaveText("Wird gemessen…");
  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await expectSlideshowScreen(page);
}

/** Plays the show from its start to its end card, one held-clock frame at a time; its gains. */
async function playThrough(page: Page): Promise<GainProbe["log"]> {
  await page.evaluate(() => {
    (window as unknown as { musicGainProbe: GainProbe }).musicGainProbe.log = [];
  });
  await page.getByRole("button", { name: "Abspielen" }).last().click();
  const player = page.getByRole("dialog");
  await expect(player).toHaveAttribute("aria-busy", "false");
  for (let frame = 0; frame < PLAY_FRAMES; frame += 1) {
    await page.clock.fastForward(FRAME_MS);
  }
  await expect(player.getByRole("heading", { name: "Ende" })).toBeVisible();
  const log = await page.evaluate(
    () => (window as unknown as { musicGainProbe: GainProbe }).musicGainProbe.log,
  );
  await page.keyboard.press("Escape");
  await expect(player).toBeHidden();
  return log;
}

/**
 * The ducked run's gain over the unducked one's at each moment since its play, where the
 * unducked music is heard at all.
 */
function duckRatios(
  ducked: GainProbe["log"],
  unducked: GainProbe["log"],
): { atMs: number; ratio: number }[] {
  const since = (log: GainProbe["log"]) =>
    new Map(log.map(({ at, value }) => [at - (log[0]?.at ?? 0), value]));
  const plain = since(unducked);
  return [...since(ducked)].flatMap(([atMs, value]) => {
    const reference = plain.get(atMs);
    return reference === undefined || reference < EPSILON
      ? []
      : [{ atMs, ratio: value / reference }];
  });
}

test("E2E-141 the music ducks under a clip with sound, ramping down before it, and keeps its volume once ducking is switched off", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Only Chromium's test build encodes the H.264 clip the case imports",
  );
  await probeMusicGain(page);
  await openApp(page);
  const clip = await generatedClip(page, "clip.mp4", CLIP_COLOUR, CLIP_SECONDS, {
    toneSeconds: CLIP_SECONDS,
  });
  const pictures = await picturesTakenOn(page, [PICTURE_DAY]);

  await openImport(page);
  await chooseFiles(page, page.getByRole("button", { name: "Bilder auswählen" }), [
    ...pictures,
    clip,
  ]);
  await expect(page.getByText("2 Bilder", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  const track = clickTrackWav("Takt.wav", TRACK_SECONDS, BEATS_PER_MINUTE);
  await chooseFiles(page, page.getByRole("button", { name: "Dateien wählen" }), [track]);
  await expect(page.getByText(track.name, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Diashow erstellen" }).click();
  await expectSlideshowScreen(page);
  await expect(
    page.getByRole("button", { name: /^Bild 2, aufgenommen am .*, Clip von 0:03$/ }),
  ).toBeVisible();
  await songAnalysed(page);

  // The show runs on the page's clock, held still and moved only by the case.
  await page.clock.install({ time: CLOCK_START });
  await page.clock.pauseAt(CLOCK_START + CLOCK_HOLD_MS);
  const ducked = await playThrough(page);

  const clipTile = page.getByRole("button", { name: /^Bild 2, aufgenommen am / });
  await clipTile.click();
  await page
    .getByRole("toolbar", { name: "Auswahl" })
    .getByRole("button", { name: "Bearbeiten" })
    .click();
  const duck = page.getByRole("checkbox", { name: "Musik währenddessen leiser" });
  await expect(duck).toBeChecked();
  await duck.uncheck();
  await page.getByRole("button", { name: "Fertig", exact: true }).click();
  await expect(duck).toBeHidden();
  // Deselected, so the show plays from its start again, not from the clip.
  await clipTile.click();
  await expect(clipTile).toHaveAttribute("aria-pressed", "false");
  const unducked = await playThrough(page);

  // The music's own trim and end fade multiply into both runs alike; their ratio is the duck alone.
  const ratios = duckRatios(ducked, unducked);
  expect(ratios.length).toBeGreaterThan(MIN_FRAMES);
  expect(ratios[0]?.ratio).toBeCloseTo(1, DIGITS);
  expect(Math.min(...ratios.map(({ ratio }) => ratio))).toBeCloseTo(VIDEO_DUCK_VOLUME, DIGITS);
  const lastFull = ratios.findLast(({ ratio }) => ratio > 1 - EPSILON);
  const firstDucked = ratios.find(({ ratio }) => ratio < VIDEO_DUCK_VOLUME + EPSILON);
  if (lastFull === undefined || firstDucked === undefined) {
    throw new Error("the music never ran at full volume and then ducked");
  }
  // It ramps down over a second before the clip, then stays low while the clip plays to the end.
  // Frames land on the case's steps, not on the ramp's ends: it spans one more step at most.
  const rampMs = firstDucked.atMs - lastFull.atMs;
  expect(rampMs).toBeGreaterThanOrEqual(VIDEO_DUCK_RAMP_DOWN_MS);
  expect(rampMs).toBeLessThanOrEqual(VIDEO_DUCK_RAMP_DOWN_MS + FRAME_MS);
  const whileClipPlays = ratios.filter(({ atMs }) => atMs >= firstDucked.atMs);
  expect(Math.max(...whileClipPlays.map(({ ratio }) => ratio))).toBeCloseTo(
    VIDEO_DUCK_VOLUME,
    DIGITS,
  );
});
