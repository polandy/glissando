import { afterEach, describe, expect, it, onTestFailed } from "vitest";
import { page } from "vitest/browser";
import { silentWav } from "../../import/testing/silent-wav";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { exportPage } from "../export-page";
import { PAGE_STATE_ATTRIBUTE, type PageCopy, type PageState } from "../page-contract";
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

/** A generated picture: a gradient with a disc, drawn on a canvas and encoded as JPEG. */
async function drawnJpeg(width: number, height: number, hue: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("no 2D canvas to draw a test picture");
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${hue} 70% 40%)`);
  gradient.addColorStop(1, `hsl(${hue + 60} 70% 70%)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = "white";
  context.beginPath();
  context.arc(width / 2, height / 2, Math.min(width, height) / 4, 0, 2 * Math.PI);
  context.fill();
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
}

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
  music: { id: "tone", fileName: "silence.wav", durationMs: MUSIC_MS, mimeType: "audio/wav" },
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

/** Resolves once the page's state is `wanted`; rejects as soon as it shows an error. */
function stateReached(document: Document, wanted: PageState, seen: PageState[]): Promise<void> {
  const root = document.documentElement;
  return new Promise((resolve, reject) => {
    const check = () => {
      const state = root.getAttribute(PAGE_STATE_ATTRIBUTE) as PageState | null;
      if (state !== null && seen.at(-1) !== state) seen.push(state);
      if (state === wanted) {
        observer.disconnect();
        resolve();
      } else if (state === "error") {
        observer.disconnect();
        reject(new Error(`the page shows an error: ${document.body.textContent}`));
      }
    };
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: [PAGE_STATE_ATTRIBUTE] });
    check();
  });
}

function loaded(frame: HTMLIFrameElement): Promise<Document> {
  return new Promise((resolve, reject) => {
    frame.addEventListener("load", () => {
      const document = frame.contentDocument;
      if (document === null) reject(new Error("the page's frame has no readable document"));
      else resolve(document);
    });
  });
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

  it("opens from a blob: URL and plays from the start card to the end card", async () => {
    let step = "export";
    const t0 = performance.now();
    let diag = (): unknown => null;
    onTestFailed(() => console.error("DIAG", step, JSON.stringify(diag())));
    const url = URL.createObjectURL(await exportedPage());
    const frame = document.createElement("iframe");
    Object.assign(frame.style, { width: "640px", height: "360px", border: "0" });
    cleanups.push(() => {
      frame.remove();
      URL.revokeObjectURL(url);
    });
    step = "load";
    const opened = loaded(frame);
    frame.src = url;
    document.body.append(frame);
    const pageDocument = await opened;
    const seen: PageState[] = [];
    diag = () => ({
      seen,
      state: pageDocument.documentElement.getAttribute("data-state"),
      time: pageDocument.querySelector(".time")?.textContent,
      fonts: pageDocument.fonts.status,
      canvas: pageDocument.querySelectorAll("canvas").length,
      ms: Math.round(performance.now() - t0),
      body: pageDocument.body.innerText.slice(0, 300),
    });
    step = "start";
    await stateReached(pageDocument, "start", seen);

    expect(pageDocument.title).toBe("Generated <test>");
    await page
      .frameLocator(page.elementLocator(frame))
      .getByRole("button", { name: "Play" })
      .click();
    step = "ended";
    await stateReached(pageDocument, "ended", seen);

    // Whether "loading" is still seen depends on when the frame's load event lands.
    expect(seen.filter((state) => state !== "loading")).toEqual(["start", "playing", "ended"]);
    expect(pageDocument.querySelector(".end")?.textContent).toContain("Play again");
  });
});
