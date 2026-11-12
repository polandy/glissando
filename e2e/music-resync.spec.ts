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

interface MusicProbe {
  element: HTMLAudioElement | null;
  seeks: number;
  landedAt: number;
}

/** Records the music element's seeks; it starts late and every seek after its start lands late. */
async function slowMusicElement(page: Page): Promise<void> {
  await page.addInitScript(
    ({ lagSeconds, startDelayMs }) => {
      const probe: MusicProbe = { element: null, seeks: 0, landedAt: 0 };
      Object.assign(window, { musicProbe: probe });
      const position = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
      const play = HTMLMediaElement.prototype.play;
      Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
        get(this: HTMLMediaElement): number {
          return position?.get?.call(this) as number;
        },
        set(this: HTMLMediaElement, seconds: number) {
          if (this instanceof HTMLAudioElement) {
            probe.element = this;
            probe.seeks += 1;
            probe.landedAt = probe.seeks === 1 ? seconds : Math.max(0, seconds - lagSeconds);
            position?.set?.call(this, probe.landedAt);
          } else {
            position?.set?.call(this, seconds);
          }
        },
      });
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        if (!(this instanceof HTMLAudioElement)) {
          return play.call(this);
        }
        return new Promise<void>((resolve) => setTimeout(resolve, startDelayMs)).then(() =>
          play.call(this),
        );
      };
    },
    { lagSeconds: LOADED_DEVICE_LAG_SECONDS, startDelayMs: START_DELAY_MS },
  );
}

/** How far the music has played past where its last seek landed. */
function playedSinceLastSeek(page: Page): Promise<number> {
  return page.evaluate(() => {
    const { musicProbe } = window as unknown as { musicProbe: MusicProbe };
    return (musicProbe.element?.currentTime ?? 0) - musicProbe.landedAt;
  });
}

test("E2E-132 music that starts late on a loaded device is seeked back once and then plays on without gaps", async ({
  page,
}) => {
  await slowMusicElement(page);
  await openApp(page);
  await createSlideshowWithMusic(page, clickTrackWav("Takt.wav", 20, 120));

  await page.getByRole("button", { name: "Abspielen" }).last().click();
  await expect(player(page, TITLE)).toBeVisible();

  await expect.poll(() => playedSinceLastSeek(page)).toBeGreaterThan(PLAYED_ON_SECONDS);
  const seeks = await page.evaluate(
    () => (window as unknown as { musicProbe: MusicProbe }).musicProbe.seeks,
  );
  // The late start was seeked back at least once, so playing on proves no seek chased its own lag.
  expect(seeks).toBeGreaterThanOrEqual(2);
});
