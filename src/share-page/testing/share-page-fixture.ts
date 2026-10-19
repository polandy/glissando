/** Shared fixtures for the share page's browser tests: a generated slideshow, and an open frame. */
import { onTestFailed } from "vitest";
import { commands } from "vitest/browser";
import { drawnJpeg, keptInView, loaded, watchPage } from "../../export-player/testing/page-frame";
import { encodeBase64 } from "../../html-export/base64";
import type { PageState } from "../../html-export/page-contract";
import { silentWav } from "../../import/testing/silent-wav";
import sharePage from "virtual:glissando-share-page";
import type { FakeMedium, FakeShareApi } from "./fake-share-api";

/** The shortest a picture may show (`checkOwnDurationMs`). */
export const SLIDE_MS = 2000;
export const MUSIC_MS = 1500;
/**
 * These tests play a real slideshow through real timers rather than a mocked clock; a full
 * playthrough already takes several seconds, and a loaded CI runner can push that past the
 * default test timeout.
 */
export const TIMEOUT_MS = 30_000;
const PICTURE_SIZES = [
  [1600, 900],
  [800, 600],
  [900, 1600],
] as const;

async function medium(blob: Blob): Promise<FakeMedium> {
  return { base64: encodeBase64(new Uint8Array(await blob.arrayBuffer())), type: blob.type };
}

/**
 * A generated slideshow with one song, as the share API answers it: three pictures at revision 1
 * unless told otherwise.
 */
export async function sharedSlideshow(
  token: string,
  {
    revision = 1,
    pictureCount = PICTURE_SIZES.length,
  }: { revision?: number; pictureCount?: number } = {},
): Promise<FakeShareApi> {
  const sizes = PICTURE_SIZES.slice(0, pictureCount);
  return {
    token,
    sharePage,
    mode: "shared",
    answer: {
      revision,
      slideshow: {
        title: "Generated <test>",
        createdAt: "2026-07-02T10:00:00Z",
        secondsPerPicture: 3,
        transition: "cut",
        pictures: sizes.map(([width, height]) => ({
          capturedAt: "2026-07-01T00:00:00Z",
          width,
          height,
          durationMs: SLIDE_MS,
          colours: { veil: "#404040", accent: "#C0C0C0" },
        })),
        songs: [{ durationMs: MUSIC_MS, mimeType: "audio/wav" }],
      },
      beats: [null],
      loudness: [null],
    },
    pictures: await Promise.all(
      sizes.map(async ([width, height], index) =>
        medium(await drawnJpeg(width, height, index * 90)),
      ),
    ),
    songs: [await medium(new Blob([silentWav(MUSIC_MS)], { type: "audio/wav" }))],
  };
}

/** Resolves once `element` is no longer hidden. */
export function shown(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (element.hidden) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(element, { attributes: true, attributeFilter: ["hidden"] });
  });
}

/** The text of the notice card the page shows; null when it shows none. */
export function shownNotice(shareDocument: Document): string | null {
  const notices = [...shareDocument.querySelectorAll<HTMLElement>(".notice")];
  return notices.find((notice) => !notice.hidden)?.textContent ?? null;
}

/**
 * Serves `fake` and opens its link in a frame, kept in view so its clock runs; `cleanups` is the
 * calling test's own list, run last in, first out, so a watch keeps its report before its frame
 * is removed.
 */
export async function openedShare(
  fake: FakeShareApi,
  cleanups: (() => Promise<void> | void)[],
): Promise<{ frame: HTMLIFrameElement; shareDocument: Document; seen: PageState[] }> {
  const seen: PageState[] = [];
  await commands.serveFakeShareApi(fake);
  cleanups.push(() => commands.stopFakeShareApi(fake.token));
  const frame = document.createElement("iframe");
  // Small enough to fit the test viewport wholly, as `keptInView` keeps it; tall enough for
  // the notice cards.
  Object.assign(frame.style, { width: "400px", height: "320px", border: "0" });
  cleanups.push(() => frame.remove());
  const first = loaded(frame);
  frame.src = `/s/${fake.token}`;
  document.body.append(frame);
  cleanups.push(keptInView(frame));
  const shareDocument = await first;
  const watch = watchPage(frame);
  cleanups.push(() => watch.stop());
  // A timeout alone says nothing; the report names where the page stopped.
  onTestFailed(() => {
    console.error(`the share page stopped: ${JSON.stringify({ seen, ...watch.report() })}`);
  });
  return { frame, shareDocument, seen };
}
