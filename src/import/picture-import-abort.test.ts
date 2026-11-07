import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { PictureImport } from "./picture-import";
import type { PictureSource, ReadPicture } from "./picture-source";
import { fileNames } from "./testing/picture-import-fixtures";

const readPicture = (fileName: string): ReadPicture => ({
  decoded: {
    width: 300,
    height: 200,
    display: new Blob([`${fileName} display`]),
    thumbnail: new Blob([`${fileName} thumbnail`]),
  },
  focus: null,
});

/**
 * A source whose download runs until `finish()` or its signal aborts (then rejecting with the
 * signal's reason, as `fetch` does); `started` settles once the import reads it.
 */
function downloadingSource(fileName: string) {
  const download: { signal: AbortSignal | null; finish: () => void } = {
    signal: null,
    finish: () => undefined,
  };
  let reached = (): void => undefined;
  const started = new Promise<void>((resolve) => (reached = resolve));
  const source: PictureSource = {
    fileName,
    mimeType: "image/jpeg",
    identify: () => Promise.resolve({ fileName, capturedAt: "2025-07-01T10:00:00Z" }),
    read: (signal) =>
      new Promise((resolve, reject) => {
        download.signal = signal ?? null;
        download.finish = () => resolve(readPicture(fileName));
        signal?.addEventListener("abort", () => reject(signal.reason as Error));
        reached();
      }),
  };
  return { source, download, started };
}

/** A source read at once; `reads` counts how often the import read it. */
function readySource(fileName: string) {
  const counter = { reads: 0 };
  const source: PictureSource = {
    fileName,
    mimeType: "image/jpeg",
    identify: () => Promise.resolve({ fileName, capturedAt: "2025-07-01T10:00:00Z" }),
    read: () => {
      counter.reads += 1;
      return Promise.resolve(readPicture(fileName));
    },
  };
  return { source, counter };
}

function setUp() {
  let next = 1;
  return new PictureImport({
    store: new MemoryLibraryStore(),
    newId: () => `picture-${next++}`,
    pixels: () => Promise.resolve([]),
  });
}

describe("PictureImport aborting the download in flight", () => {
  it("cancel() aborts the file in flight and reads no further file", async () => {
    const pictureImport = setUp();
    const first = downloadingSource("a.jpg");
    const second = readySource("b.jpg");
    pictureImport.add([first.source, second.source]);
    await first.started;

    pictureImport.cancel();

    expect(first.download.signal?.aborted).toBe(true);
    await pictureImport.settled();
    expect(pictureImport.state).toMatchObject({ total: 0, done: 0, busy: false, failed: false });
    expect(second.counter.reads).toBe(0);
  });

  it("stop() aborts that pick's file in flight and goes on with the next pick", async () => {
    const pictureImport = setUp();
    const stopped = downloadingSource("a.jpg");
    pictureImport.add([stopped.source]);
    pictureImport.add([readySource("b.jpg").source]);
    await stopped.started;

    pictureImport.stop("pick-1");

    expect(stopped.download.signal?.aborted).toBe(true);
    await pictureImport.settled();
    expect(fileNames(pictureImport.state)).toEqual(["b.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 1, done: 1, busy: false, failed: false });
  });

  it("stop() of another pick leaves the file in flight downloading", async () => {
    const pictureImport = setUp();
    const running = downloadingSource("a.jpg");
    pictureImport.add([running.source]);
    pictureImport.add([readySource("b.jpg").source]);
    await running.started;

    pictureImport.stop("pick-2");
    running.download.finish();
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg"]);
    expect(running.download.signal?.aborted).toBe(false);
  });
});
