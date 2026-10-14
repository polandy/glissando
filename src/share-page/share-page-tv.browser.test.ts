import { afterEach, describe, expect, it, onTestFailed } from "vitest";
import { commands, page } from "vitest/browser";
import {
  drawnJpeg,
  keptInView,
  loaded,
  stateReached,
  watchPage,
} from "../export-player/testing/page-frame";
import { encodeBase64 } from "../html-export/base64";
import type { PageState } from "../html-export/page-contract";
import { silentWav } from "../import/testing/silent-wav";
import type { PlaybackState } from "../tv-remote/tv-protocol";
import sharePage from "virtual:glissando-share-page";
import type { FakeMedium } from "./testing/fake-share-api";
import type { FakeTvApi } from "./testing/fake-tv-api";

/** Long enough that the slideshow still plays when the pause arrives on a loaded runner. */
const SLIDE_MS = 8000;
const MUSIC_MS = 1500;
/** Real timers and a real stream, as in the share page's own test. */
const TIMEOUT_MS = 30_000;
const CODES = ["KQMT", "WXRB"];

async function medium(blob: Blob): Promise<FakeMedium> {
  return { base64: encodeBase64(new Uint8Array(await blob.arrayBuffer())), type: blob.type };
}

/** A generated slideshow of two pictures and one song, as the phone would choose it. */
async function fakeTvApi(): Promise<FakeTvApi> {
  return {
    sharePage,
    codes: CODES,
    answer: {
      revision: 1,
      slideshow: {
        title: "Generated on TV",
        createdAt: "2026-07-02T10:00:00Z",
        secondsPerPicture: 3,
        transition: "cut",
        pictures: [0, 1].map(() => ({
          capturedAt: "2026-07-01T00:00:00Z",
          width: 1600,
          height: 900,
          durationMs: SLIDE_MS,
          colours: { veil: "#404040", accent: "#C0C0C0" },
        })),
        songs: [{ durationMs: MUSIC_MS, mimeType: "audio/wav" }],
      },
      beats: [null],
    },
    pictures: await Promise.all(
      [0, 1].map(async (index) => medium(await drawnJpeg(1600, 900, index * 120))),
    ),
    songs: [await medium(new Blob([silentWav(MUSIC_MS)], { type: "audio/wav" }))],
  };
}

/** Resolves once the TV card shows and says `text`. */
function cardSays(tvDocument: Document, text: string): Promise<void> {
  const says = () =>
    [...tvDocument.querySelectorAll<HTMLElement>(".tv-card")].some(
      (card) => !card.hidden && (card.textContent ?? "").includes(text),
    );
  return new Promise((resolve) => {
    if (says()) return resolve();
    const observer = new MutationObserver(() => {
      if (!says()) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(tvDocument.body, { subtree: true, childList: true, attributes: true });
  });
}

/** The next report that `matches`, the ones before it skipped. */
async function reportWhere(matches: (state: PlaybackState) => boolean): Promise<PlaybackState> {
  for (;;) {
    const state = (await commands.nextFakeTvReport()) as PlaybackState;
    if (matches(state)) return state;
  }
}

describe("the share page as the TV page", () => {
  const cleanups: (() => Promise<void> | void)[] = [];
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  });

  async function opened(fake: FakeTvApi) {
    const seen: PageState[] = [];
    await commands.serveFakeTvApi(fake);
    cleanups.push(() => commands.stopFakeTvApi());
    const frame = document.createElement("iframe");
    Object.assign(frame.style, { width: "400px", height: "320px", border: "0" });
    cleanups.push(() => frame.remove());
    const first = loaded(frame);
    frame.src = "/tv";
    document.body.append(frame);
    cleanups.push(keptInView(frame));
    const tvDocument = await first;
    const watch = watchPage(frame);
    cleanups.push(() => watch.stop());
    onTestFailed(() => {
      console.error(`the TV page stopped: ${JSON.stringify({ seen, ...watch.report() })}`);
    });
    return { frame, tvDocument, seen };
  }

  it(
    "pairs by its code, plays what the phone chose, pauses on command and pairs anew at the end",
    { timeout: TIMEOUT_MS },
    async () => {
      const { frame, tvDocument, seen } = await opened(await fakeTvApi());
      const tv = page.frameLocator(page.elementLocator(frame));
      await cardSays(tvDocument, CODES[0] ?? "");
      expect(tvDocument.querySelector(".tv-code")?.textContent).toBe(CODES[0]);
      expect(tvDocument.querySelector(".tv-card .qr")?.getAttribute("aria-label")).toBeTruthy();
      // The gesture a viewer gives with OK on the TV remote, so the music may start by itself.
      await tv.getByRole("button", { name: "Allow sound" }).click();

      const playing = stateReached(tvDocument, "playing", seen);
      await commands.sendFakeTvEvent("claimed", {});
      await cardSays(tvDocument, "Phone connected");
      await commands.sendFakeTvEvent("show", {});
      await playing;
      expect(tvDocument.title).toBe("Generated on TV");
      await reportWhere((state) => state.playing);

      const paused = stateReached(tvDocument, "paused", seen);
      await commands.sendFakeTvEvent("command", { type: "pause" });
      await paused;
      const reported = await reportWhere((state) => !state.playing);
      expect(reported).toMatchObject({ title: "Generated on TV", pictureCount: 2, ended: false });
      expect(tvDocument.querySelector(".tv-note")?.textContent).toBe("Paused");

      await commands.sendFakeTvEvent("end", {});
      await cardSays(tvDocument, CODES[1] ?? "");
      expect(tvDocument.querySelector(".stage")).toBeNull();
    },
  );
});
