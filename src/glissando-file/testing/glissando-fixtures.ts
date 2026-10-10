import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { exportSlideshow } from "../export-slideshow";
import { StoredZipWriter } from "../stored-zip";

export const MODIFIED_AT = new Date("2025-10-01T08:00:00Z");

/**
 * Two pictures in an own order, the first with a caption, its own duration and transition and a
 * file size of origin, the second with its own motion, an Immich asset id of origin, an
 * alternating default transition, and music, as stored on the exporting device.
 */
export const EXPORTED_SLIDESHOW: StoredSlideshow = {
  id: "source-show",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: "src-p2",
      capturedAt: "2025-09-30T11:00:00Z",
      width: 40,
      height: 30,
      fileName: "b.jpg",
      caption: "Am Steg",
      durationMs: 8000,
      transition: "dissolve",
      fileBytes: 2_500_000,
    },
    {
      id: "src-p1",
      capturedAt: "2025-09-30T10:00:00Z",
      width: 40,
      height: 30,
      fileName: "a.jpg",
      immichAssetId: "asset-a1",
      kenBurns: {
        from: { zoom: 2, centerX: 0.25, centerY: 0.5 },
        to: { zoom: 1.25, centerX: 0.6, centerY: 0.4 },
      },
    },
  ],
  ownOrder: true,
  transition: "alternate",
  music: {
    id: "src-m1",
    fileName: "Walzer.m4a",
    durationMs: 240000,
    mimeType: "audio/mp4",
    trim: { startMs: 12_000, endMs: 200_000 },
    fadeOutMs: 5000,
  },
  secondsPerPicture: 5,
};

const jpeg = (content: string): Blob => new Blob([content], { type: "image/jpeg" });

/** A .glissando file as the export writes it. */
export async function exportedFile(slideshow = EXPORTED_SLIDESHOW): Promise<Blob> {
  const store = new MemoryLibraryStore();
  await store.putPicture("src-p1", { display: jpeg("display one"), thumbnail: jpeg("thumb one") });
  await store.putPicture("src-p2", { display: jpeg("display two"), thumbnail: jpeg("thumb two") });
  await store.putMusic("src-m1", new Blob(["music bytes"], { type: "audio/mp4" }));
  return exportSlideshow(slideshow, store, { modifiedAt: MODIFIED_AT });
}

/** A stored ZIP of the given entries, in order. */
export async function zipWith(entries: Readonly<Record<string, string>>): Promise<Blob> {
  const writer = new StoredZipWriter(MODIFIED_AT);
  for (const [name, content] of Object.entries(entries)) {
    await writer.add(name, new Blob([content]));
  }
  return writer.finish();
}

/** `file` with the first occurrence of `from` (ASCII) replaced by `to` of the same length. */
export async function withBytesReplaced(file: Blob, from: string, to: string): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const needle = new TextEncoder().encode(from);
  const at = bytes.findIndex((_, index) =>
    needle.every((byte, offset) => bytes[index + offset] === byte),
  );
  if (at < 0 || from.length !== to.length) {
    throw new Error(`cannot replace "${from}" with "${to}" in the fixture`);
  }
  bytes.set(new TextEncoder().encode(to), at);
  return new Blob([bytes]);
}
