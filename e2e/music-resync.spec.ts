// Spec: docs/dev/composition/MUSIC.md
import { expect, test, type Page } from "@playwright/test";
import { createSlideshowWithMusic, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { clickTrackWav } from "./support/media";
import { player } from "./support/player";

test.use(GERMAN_BROWSER);

const TITLE = "Juli 2025";
/** How late the music starts and every later seek lands, as on a device busy preparing pictures. */
const LOADED_DEVICE_LAG_SECONDS = 0.4;
const START_DELAY_MS = 500;
/** Long enough past the last seek that a resync after every frame could never reach it. */
const PLAYED_ON_SECONDS = 2;
const CLOCK_START = new Date("2026-01-01T12:00:00Z").getTime();
const CLOCK_HOLD_MS = 60_000;
/** One player frame per step of the held page clock. */
const FRAME_MS = 100;
const FRAMES = 40;
const HAVE_ENOUGH_DATA = 4;
const MS_PER_SECOND = 1000;

interface MusicProbe {
  element: HTMLAudioElement | null;
  seeks: number;
  landedAt: number;
}

/**
 * Stands in for the music element, playing on the page's clock: it starts late, without a seek,
 * and every seek lands late. So how far it plays depends on the case's clock, not the machine.
 */
async function slowMusicElement(page: Page): Promise<void> {
  await page.addInitScript(
    ({ lagSeconds, startDelayMs, haveEnoughData, msPerSecond }) => {
      const probe: MusicProbe = { element: null, seeks: 0, landedAt: 0 };
      Object.assign(window, { musicProbe: probe });
      const media = HTMLMediaElement.prototype;
      const real = {
        currentTime: Object.getOwnPropertyDescriptor(media, "currentTime"),
        paused: Object.getOwnPropertyDescriptor(media, "paused"),
        seeking: Object.getOwnPropertyDescriptor(media, "seeking"),
        readyState: Object.getOwnPropertyDescriptor(media, "readyState"),
        play: media.play,
        pause: media.pause,
      };
      /** Where the music stands, since when it plays from there (null: paused), its play calls. */
      const states = new WeakMap<
        HTMLMediaElement,
        { at: number; since: number | null; plays: number }
      >();
      const stateOf = (element: HTMLMediaElement) => {
        const state = states.get(element) ?? { at: 0, since: null, plays: 0 };
        states.set(element, state);
        return state;
      };
      const positionOf = (element: HTMLMediaElement): number => {
        const { at, since } = stateOf(element);
        return since === null ? at : at + (performance.now() - since) / msPerSecond;
      };
      const audioOnly = <T>(name: keyof typeof real, fake: (element: HTMLMediaElement) => T) => ({
        get(this: HTMLMediaElement): T {
          return this instanceof HTMLAudioElement
            ? fake(this)
            : ((real[name] as PropertyDescriptor).get?.call(this) as T);
        },
      });
      Object.defineProperty(
        media,
        "paused",
        audioOnly("paused", (e) => stateOf(e).since === null),
      );
      Object.defineProperty(
        media,
        "seeking",
        audioOnly("seeking", () => false),
      );
      Object.defineProperty(
        media,
        "readyState",
        audioOnly("readyState", () => haveEnoughData),
      );
      Object.defineProperty(media, "currentTime", {
        ...audioOnly("currentTime", positionOf),
        set(this: HTMLMediaElement, seconds: number) {
          if (!(this instanceof HTMLAudioElement)) {
            real.currentTime?.set?.call(this, seconds);
            return;
          }
          const state = stateOf(this);
          probe.element = this;
          probe.seeks += 1;
          probe.landedAt = Math.max(0, seconds - lagSeconds);
          state.at = probe.landedAt;
          state.since = state.since === null ? null : performance.now();
        },
      });
      media.play = function (this: HTMLMediaElement) {
        if (!(this instanceof HTMLAudioElement)) {
          return real.play.call(this);
        }
        const state = stateOf(this);
        probe.element = this;
        const play = ++state.plays;
        return new Promise<void>((resolve) => setTimeout(resolve, startDelayMs)).then(() => {
          if (play === state.plays && state.since === null) {
            state.since = performance.now();
          }
        });
      };
      media.pause = function (this: HTMLMediaElement) {
        if (!(this instanceof HTMLAudioElement)) {
          real.pause.call(this);
          return;
        }
        const state = stateOf(this);
        state.at = positionOf(this);
        state.since = null;
        state.plays += 1;
      };
    },
    {
      lagSeconds: LOADED_DEVICE_LAG_SECONDS,
      startDelayMs: START_DELAY_MS,
      haveEnoughData: HAVE_ENOUGH_DATA,
      msPerSecond: MS_PER_SECOND,
    },
  );
}

function probe(page: Page): Promise<{ seeks: number; playedSinceLastSeek: number }> {
  return page.evaluate(() => {
    const { musicProbe } = window as unknown as { musicProbe: MusicProbe };
    return {
      seeks: musicProbe.seeks,
      playedSinceLastSeek: (musicProbe.element?.currentTime ?? 0) - musicProbe.landedAt,
    };
  });
}

test("E2E-132 music that starts late on a loaded device is seeked back once and then plays on without gaps", async ({
  page,
}) => {
  await slowMusicElement(page);
  await openApp(page);
  await createSlideshowWithMusic(page, clickTrackWav("Takt.wav", 20, 120));

  // Show and music run on the page's clock, held still and moved only by the case.
  await page.clock.install({ time: CLOCK_START });
  await page.clock.pauseAt(CLOCK_START + CLOCK_HOLD_MS);
  await page.getByRole("button", { name: "Abspielen" }).last().click();
  await expect(player(page, TITLE)).toHaveAttribute("aria-busy", "false");
  for (let frame = 0; frame < FRAMES; frame += 1) {
    await page.clock.fastForward(FRAME_MS);
  }

  const { seeks, playedSinceLastSeek } = await probe(page);
  expect(seeks).toBe(1);
  expect(playedSinceLastSeek).toBeGreaterThan(PLAYED_ON_SECONDS);
});
