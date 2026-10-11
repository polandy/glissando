import { afterEach, describe, expect, it, onTestFailed } from "vitest";
import { page } from "vitest/browser";
import { silentWav } from "../../import/testing/silent-wav";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { exportPage } from "../export-page";
import { PAGE_STATE_ATTRIBUTE, type PageCopy, type PageState } from "../page-contract";
import {
  drawnJpeg,
  keptInView,
  loaded,
  stateReached,
} from "../../export-player/testing/page-frame";
import { bundledPlayerAsset } from "./bundled-player-asset";
import { canvasPictureScaler } from "./canvas-picture-scaler";
import { MemoryBlobSink } from "./page-sinks";

const COPY: PageCopy = {
  eyebrow: "Slideshow",
  summary: "3 pictures · 0:01 · with music",
  madeWith: "Made with Glissando · plays offline",
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  unmute: "Unmute",
  fullScreen: "Full screen",
  timeline: "Timeline",
  playAgain: "Play again",
  cannotPlay: "This slideshow cannot play here.",
};

const SLIDE_MS = 400;
const MUSIC_MS = 1500;

function storedPicture(id: string, width: number, height: number): StoredPicture {
  return {
    id,
    capturedAt: "2026-07-01T10:00:00Z",
    width,
    height,
    fileName: `${id}.jpg`,
    durationMs: SLIDE_MS,
  };
}

const PICTURES = [
  storedPicture("wide", 1600, 900),
  storedPicture("fits", 800, 600),
  storedPicture("tall", 900, 1600),
];

const STORED: StoredSlideshow = {
  id: "generated",
  title: "Generated <test>",
  createdAt: "2026-07-02T10:00:00Z",
  pictures: PICTURES,
  songs: [
    { id: "first", fileName: "first.wav", durationMs: MUSIC_MS, mimeType: "audio/wav" },
    { id: "second", fileName: "second.wav", durationMs: MUSIC_MS, mimeType: "audio/wav" },
  ],
  secondsPerPicture: 3,
  transition: "cut",
};

async function exportedPage(): Promise<Blob> {
  const blobs = new Map(
    await Promise.all(
      PICTURES.map(
        async (picture, index) =>
          [picture.id, await drawnJpeg(picture.width, picture.height, index * 90)] as const,
      ),
    ),
  );
  const sink = new MemoryBlobSink();
  await exportPage({
    stored: STORED,
    focus: new Map(),
    beats: new Map(),
    sizeId: "small",
    lang: "en",
    copy: COPY,
    noscript: "This slideshow needs JavaScript.",
    media: {
      pictureBlob: (id) => Promise.resolve(blobs.get(id) ?? new Blob()),
      musicBlob: () => Promise.resolve(new Blob([silentWav(MUSIC_MS)], { type: "audio/wav" })),
    },
    scaler: canvasPictureScaler,
    sink,
    playerAsset: bundledPlayerAsset,
  });
  return sink.blob();
}

/** How far a run of the exported page got. */
interface PlayProgress {
  step: string;
  page: Document | null;
  readonly seen: PageState[];
  /** Animation frames run since Play, in the page's frame and in the test's own. */
  readonly animationFrames: { page: number; test: number };
}

/** Where `element` sits in its window's viewport, so a frame scrolled out of view shows. */
function placeInView(element: Element | null | undefined): string {
  if (element === null || element === undefined) return "none";
  const { top, bottom } = element.getBoundingClientRect();
  const view = element.ownerDocument.defaultView;
  return `${Math.round(top)}..${Math.round(bottom)} of ${view?.innerHeight ?? "?"}`;
}

function progressReport({ step, page, seen, animationFrames }: PlayProgress): string {
  const details =
    page === null
      ? {}
      : {
          state: page.documentElement.getAttribute(PAGE_STATE_ATTRIBUTE),
          time: page.querySelector(".time")?.textContent,
          progress: page.querySelector<HTMLElement>(".progress")?.style.width,
          fonts: page.fonts.status,
          canvases: page.querySelectorAll("canvas").length,
          error: page.querySelector(".error")?.textContent,
          visibility: page.visibilityState,
          animationFrames,
          pageFrame: placeInView(page.defaultView?.frameElement),
          testFrame: placeInView(window.frameElement),
        };
  return `the exported page stopped while ${step}: ${JSON.stringify({ seen, ...details })}`;
}

/** Counts `window`'s animation frames into `counts[key]` until the returned stop is called. */
function countAnimationFrames(
  window: Window,
  counts: PlayProgress["animationFrames"],
  key: keyof PlayProgress["animationFrames"],
): () => void {
  let handle = 0;
  const tick = () => {
    counts[key] += 1;
    handle = window.requestAnimationFrame(tick);
  };
  handle = window.requestAnimationFrame(tick);
  return () => window.cancelAnimationFrame(handle);
}

describe("an exported web page", () => {
  const cleanups: (() => void)[] = [];
  afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

  it("holds each picture fitted within the size, never scaled up", async () => {
    const text = await (await exportedPage()).text();
    const sizes = await Promise.all(
      ["p0", "p1", "p2"].map(async (key) => {
        const base64 = new RegExp(`id="${key}"[^>]*>([^<]*)<`).exec(text)?.[1] ?? "";
        const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
        return [bitmap.width, bitmap.height];
      }),
    );

    expect(sizes).toEqual([
      [1280, 720],
      [800, 600],
      [720, 1280],
    ]);
  });

  /** Opens the exported page from a `blob:` URL, clicks Play and waits for the end card. */
  async function playedToTheEndCard(
    whilePlaying: () => void = () => {},
  ): Promise<{ readonly pageDocument: Document; readonly seen: readonly PageState[] }> {
    const progress: PlayProgress = {
      step: "exporting",
      page: null,
      seen: [],
      animationFrames: { page: 0, test: 0 },
    };
    // A timeout alone says nothing; the report names where the page stopped.
    onTestFailed(() => console.error(progressReport(progress)));
    const url = URL.createObjectURL(await exportedPage());
    const frame = document.createElement("iframe");
    // Small enough to fit the test viewport wholly, as `keptInView` keeps it.
    Object.assign(frame.style, { width: "320px", height: "180px", border: "0" });
    cleanups.push(() => {
      frame.remove();
      URL.revokeObjectURL(url);
    });

    progress.step = "loading the frame";
    const opened = loaded(frame);
    frame.src = url;
    document.body.append(frame);
    cleanups.push(keptInView(frame));
    const pageDocument = await opened;
    progress.page = pageDocument;
    progress.step = "waiting for the start card";
    await stateReached(pageDocument, "start", progress.seen);
    expect(pageDocument.title).toBe("Generated <test>");

    progress.step = "clicking Play";
    await page
      .frameLocator(page.elementLocator(frame))
      .getByRole("button", { name: "Play" })
      .click();
    progress.step = "playing to the end card";
    const pageWindow = pageDocument.defaultView;
    if (pageWindow !== null) {
      cleanups.push(countAnimationFrames(pageWindow, progress.animationFrames, "page"));
    }
    cleanups.push(countAnimationFrames(window, progress.animationFrames, "test"));
    whilePlaying();
    await stateReached(pageDocument, "ended", progress.seen);
    return { pageDocument, seen: progress.seen };
  }

  it("opens from a blob: URL and plays both songs from the start card to the end card", async () => {
    const { pageDocument, seen } = await playedToTheEndCard();

    expect(pageDocument.getElementById("s1")).not.toBeNull();
    // Whether "loading" is still seen depends on when the frame's load event lands.
    expect(seen.filter((state) => state !== "loading")).toEqual(["start", "playing", "ended"]);
    expect(pageDocument.querySelector(".end")?.textContent).toContain("Play again");
  });

  it("plays to the end card when a frame above pushes this test's frame out of view", async () => {
    // In a full run Vitest stacks each test file's frame below the ones that ran before it.
    const testFrame = window.frameElement;
    if (testFrame === null) throw new Error("the test runs in no frame");
    const frameAbove = testFrame.ownerDocument.createElement("div");
    frameAbove.style.height = "100%";
    cleanups.push(() => frameAbove.remove());

    const { pageDocument } = await playedToTheEndCard(() => testFrame.before(frameAbove));

    expect(frameAbove.isConnected).toBe(true);
    expect(pageDocument.querySelector(".end")?.textContent).toContain("Play again");
  });
});
