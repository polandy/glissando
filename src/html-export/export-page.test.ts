import { describe, expect, it } from "vitest";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { parseSlideshow } from "../player";
import {
  exportPage,
  PagePictureError,
  PlayerAssetError,
  type PageExportJob,
  type PageExportProgress,
} from "./export-page";
import { FakeScaler, fixedPlayerAsset, MemoryPageSink } from "./testing/fakes";

function picture(id: string, width: number, height: number): StoredPicture {
  return {
    id,
    capturedAt: "2026-07-01T10:00:00Z",
    width,
    height,
    fileName: `${id}.jpg`,
  };
}

const WITHOUT_MUSIC: StoredSlideshow = {
  id: "s1",
  title: "Rom",
  createdAt: "2026-07-02T10:00:00Z",
  pictures: [picture("big", 3840, 2160), picture("fits", 1000, 600), picture("tall", 2160, 3840)],
  secondsPerPicture: 4,
};

const STORED: StoredSlideshow = {
  ...WITHOUT_MUSIC,
  music: { id: "m1", fileName: "song.mp3", durationMs: 60_000, mimeType: "audio/mpeg" },
};

const COPY = {
  eyebrow: "Diashow",
  summary: "3 Bilder · 0:12 · mit Musik",
  madeWith: "Erstellt mit Glissando",
  play: "Abspielen",
  pause: "Pause",
  mute: "Ton aus",
  unmute: "Ton an",
  fullScreen: "Vollbild",
  timeline: "Zeitleiste",
  playAgain: "Nochmal abspielen",
  cannotPlay: "Geht nicht.",
};

interface Run {
  readonly job: PageExportJob;
  readonly sink: MemoryPageSink;
  readonly scaler: FakeScaler;
  readonly reads: string[];
  readonly progress: PageExportProgress[];
}

function run(overrides: Partial<PageExportJob> = {}): Run {
  const sink = new MemoryPageSink();
  const scaler = new FakeScaler();
  const reads: string[] = [];
  const progress: PageExportProgress[] = [];
  const job: PageExportJob = {
    stored: STORED,
    focus: new Map(),
    sizeId: "small",
    lang: "de",
    copy: COPY,
    noscript: "Braucht JavaScript.",
    media: {
      pictureBlob: (id) => {
        reads.push(id);
        return Promise.resolve(new Blob([`bytes of ${id}`], { type: "image/jpeg" }));
      },
      musicBlob: (id) => Promise.resolve(new Blob([`bytes of ${id}`], { type: "audio/mpeg" })),
    },
    scaler,
    sink,
    playerAsset: fixedPlayerAsset(),
    onProgress: (step) => progress.push(step),
    ...overrides,
  };
  return { job, sink, scaler, reads, progress };
}

/** The text inside the `<script>` with `id`, or undefined. */
function block(page: string, id: string): string | undefined {
  const match = new RegExp(`<script[^>]* id="${id}"[^>]*>([^<]*)</script>`).exec(page);
  return match?.[1];
}

function decoded(page: string, id: string): string | undefined {
  const base64 = block(page, id);
  return base64 === undefined ? undefined : atob(base64);
}

describe("exportPage", () => {
  it("writes the page in order: head, each picture as p<n>, the music, the player, then closes", async () => {
    const { job, sink } = run();

    await exportPage(job);

    const page = sink.text;
    const order = ["slideshow", "copy", "p0", "p1", "p2", "music"].map((id) =>
      page.indexOf(`id="${id}"`),
    );
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(page.indexOf("<script>startPage()</script>")).toBeGreaterThan(order.at(-1) ?? 0);
    expect(page.endsWith("</html>\n")).toBe(true);
    expect(sink.closed).toBe(true);
  });

  it("points the slideshow's pictures at their blocks and its music at the music block", async () => {
    const { job, sink } = run();

    await exportPage(job);

    const slideshow = parseSlideshow(JSON.parse(block(sink.text, "slideshow") ?? "null"));
    expect(slideshow.slides.map((slide) => slide.image.src)).toEqual(["p0", "p1", "p2"]);
    expect(slideshow.music?.src).toBe("music");
    expect(sink.text).toContain('id="music" data-type="audio/mpeg"');
    expect(decoded(sink.text, "music")).toBe("bytes of m1");
  });

  it("scales a picture larger than the size down to fit it, as JPEG q 0.85", async () => {
    const { job, sink, scaler } = run();

    await exportPage(job);

    expect(scaler.calls).toEqual([
      { text: "bytes of big", size: { width: 1280, height: 720 }, quality: 0.85 },
      { text: "bytes of tall", size: { width: 720, height: 1280 }, quality: 0.85 },
    ]);
    expect(decoded(sink.text, "p0")).toBe("scaled 1280x720 from bytes of big");
    expect(sink.text).toContain('id="p0" data-type="image/jpeg"');
  });

  it("takes the stored bytes of a picture that already fits the size", async () => {
    const { job, sink } = run();

    await exportPage(job);

    expect(decoded(sink.text, "p1")).toBe("bytes of fits");
  });

  it("leaves the music out of a slideshow without music", async () => {
    const { job, sink } = run({ stored: WITHOUT_MUSIC });

    await exportPage(job);

    expect(block(sink.text, "p2")).toBeDefined();
    expect(block(sink.text, "music")).toBeUndefined();
    expect(JSON.parse(block(sink.text, "slideshow") ?? "null")).not.toHaveProperty("music");
  });

  it("reports picture n of N with the bytes written so far, and the total at the end", async () => {
    const { job, sink, progress } = run();
    const lengths: number[] = [];
    sink.beforeWrite = () => lengths.push(sink.text.length);

    const result = await exportPage(job);

    expect(progress.map((step) => [step.picturesDone, step.pictureCount])).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
      [3, 3],
    ]);
    expect(
      progress
        .map((step) => step.bytesWritten)
        .every((bytes, i, all) => bytes >= (all[i - 1] ?? 0)),
    ).toBe(true);
    expect(result.bytesWritten).toBe(new TextEncoder().encode(sink.text).length);
    expect(progress.at(-1)?.bytesWritten).toBe(result.bytesWritten);
  });

  it("stops before the next picture once cancelled, with the signal's reason, and drops the file", async () => {
    const controller = new AbortController();
    const { job, sink, reads } = run({ signal: controller.signal });
    sink.beforeWrite = (text) => {
      if (text.includes('id="p0"')) controller.abort();
    };

    const failure = await exportPage(job).catch((error: unknown) => error);

    expect(failure).toBe(controller.signal.reason);

    expect(reads).toEqual(["big"]);
    expect(sink.aborted).toBe(true);
    expect(sink.closed).toBe(false);
  });

  it("fails with PagePictureError naming the picture that could not be read, and drops the file", async () => {
    const unreadable = new Error("gone");
    const { job, sink } = run({
      media: {
        pictureBlob: (id) =>
          id === "fits" ? Promise.reject(unreadable) : Promise.resolve(new Blob([id])),
        musicBlob: () => Promise.resolve(new Blob([])),
      },
    });

    const failure = await exportPage(job).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PagePictureError);
    expect(failure).toMatchObject({ pictureIndex: 1, fileName: "fits.jpg", cause: unreadable });
    expect(sink.aborted).toBe(true);
  });

  it("fails with PlayerAssetError before writing anything when the player cannot load", async () => {
    const { job, sink } = run({
      playerAsset: { load: () => Promise.reject(new Error("offline")) },
    });

    await expect(exportPage(job)).rejects.toBeInstanceOf(PlayerAssetError);

    expect(sink.writes).toEqual([]);
    expect(sink.aborted).toBe(true);
  });
});
