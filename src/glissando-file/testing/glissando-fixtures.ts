import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { exportSlideshow } from "../export-slideshow";
import { StoredZipWriter } from "../stored-zip";
import { readEntry, readZipDirectory } from "../zip-reader";
import type { RawEntry } from "./raw-zip";

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
      colours: { veil: "#404040", accent: "#C0C0C0" },
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
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  ownOrder: true,
  transition: "alternate",
  songs: [
    {
      id: "src-m1",
      fileName: "Walzer.m4a",
      durationMs: 240000,
      mimeType: "audio/mp4",
      trim: { startMs: 12_000, endMs: 200_000 },
      fadeOutMs: 5000,
    },
  ],
  secondsPerPicture: 5,
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** A PNG signature plus its IHDR chunk: the only part `readPictureHeader` reads. */
export const PICTURE_HEADER_BYTES = 24;

/**
 * A minimal PNG whose header declares `width`×`height`, with `marker` appended after the header
 * so a byte-level corruption test (`withBytesReplaced`) can target it without touching the header.
 */
export function tinyPicture(marker: string, width = 40, height = 30): Blob {
  const bytes = new Uint8Array(PICTURE_HEADER_BYTES);
  bytes.set(PNG_SIGNATURE, 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13); // IHDR chunk's data length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new Blob([bytes, marker], { type: "image/png" });
}

const EXPORTED_PICTURE_MARKERS = {
  displayOne: "display one",
  thumbOne: "thumb one",
  displayTwo: "display two",
  thumbTwo: "thumb two",
} as const;
const EXPORTED_MUSIC_BYTES_TEXT = "music bytes";

/** The bytes `exportedFile`'s media need: two pictures' two renditions each, plus the music. */
export const EXPORTED_MEDIA_BYTES =
  Object.values(EXPORTED_PICTURE_MARKERS).reduce(
    (sum, marker) => sum + PICTURE_HEADER_BYTES + marker.length,
    0,
  ) + EXPORTED_MUSIC_BYTES_TEXT.length;

/** A .glissando file as the export writes it. */
export async function exportedFile(slideshow = EXPORTED_SLIDESHOW): Promise<Blob> {
  const store = new MemoryLibraryStore();
  const { displayOne, thumbOne, displayTwo, thumbTwo } = EXPORTED_PICTURE_MARKERS;
  await store.putPicture("src-p1", {
    display: tinyPicture(displayOne),
    thumbnail: tinyPicture(thumbOne),
  });
  await store.putPicture("src-p2", {
    display: tinyPicture(displayTwo),
    thumbnail: tinyPicture(thumbTwo),
  });
  await store.putMusic("src-m1", new Blob([EXPORTED_MUSIC_BYTES_TEXT], { type: "audio/mp4" }));
  return exportSlideshow(slideshow, store, { modifiedAt: MODIFIED_AT });
}

/** The exported file's entries, as raw entries a test may pack and change at will. */
export async function exportedEntries(): Promise<RawEntry[]> {
  const file = await exportedFile();
  const entries: RawEntry[] = [];
  for (const entry of (await readZipDirectory(file)) ?? []) {
    const read = await readEntry(file, entry);
    if (read.kind === "ok") {
      entries.push({ name: entry.name, content: new Uint8Array(await read.data.arrayBuffer()) });
    }
  }
  return entries;
}

/** Every entry's bytes as text, by name, as the reader unpacks them. */
export async function entryTexts(file: Blob): Promise<Record<string, string>> {
  const texts: Record<string, string> = {};
  for (const entry of (await readZipDirectory(file)) ?? []) {
    const read = await readEntry(file, entry);
    if (read.kind !== "ok") {
      throw new Error(`the fixture's "${entry.name}" does not read: ${read.reason}`);
    }
    texts[entry.name] = await read.data.text();
  }
  return texts;
}

/** A stored ZIP of the given entries, in order; a string entry becomes its UTF-8 bytes. */
export async function zipWith(entries: Readonly<Record<string, string | Blob>>): Promise<Blob> {
  const writer = new StoredZipWriter(MODIFIED_AT);
  for (const [name, content] of Object.entries(entries)) {
    await writer.add(name, content instanceof Blob ? content : new Blob([content]));
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

/** The poster pictures `a` and `b` play the clip `src-c1` (the first with its own excerpt), `c` plays `src-c2`. */
export const VIDEO_SLIDESHOW: StoredSlideshow = {
  id: "video-show",
  title: "Mit Clips",
  createdAt: "2025-10-01T08:00:00.000Z",
  secondsPerPicture: 5,
  songs: [],
  pictures: ["a", "b", "c"].map((name, index) => ({
    id: `src-${name}`,
    capturedAt: "2025-09-30T10:00:00Z",
    width: 40,
    height: 30,
    fileName: `${name}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    video: {
      mediaId: index < 2 ? "src-c1" : "src-c2",
      sourceMs: 20_000,
      startMs: index === 1 ? 4000 : 1000,
      endMs: index === 1 ? 9000 : 6000,
      ...(index === 0 ? { volume: 60, duckMusic: false as const } : {}),
    },
  })),
};

/** The text each of `exportedVideoFile`'s two clips carries, so a test can target one by name. */
export const VIDEO_CLIP_MARKERS = { clipOne: "clip one", clipTwo: "clip two" } as const;

/** The bytes `exportedVideoFile`'s two clips need, each counted once. */
export const EXPORTED_VIDEO_CLIP_BYTES = Object.values(VIDEO_CLIP_MARKERS).reduce(
  (sum, marker) => sum + marker.length,
  0,
);

/** The bytes `exportedVideoFile`'s pictures need: one display and one thumbnail per slide. */
export const EXPORTED_VIDEO_PICTURE_BYTES = ["a", "b", "c"].reduce(
  (sum, name) =>
    sum +
    (PICTURE_HEADER_BYTES + `display ${name}`.length) +
    (PICTURE_HEADER_BYTES + `thumb ${name}`.length),
  0,
);

/** A .glissando file of `VIDEO_SLIDESHOW`, its two clips in the store as `src-c1` and `src-c2`. */
export async function exportedVideoFile(): Promise<Blob> {
  const store = new MemoryLibraryStore();
  for (const name of ["a", "b", "c"]) {
    await store.putPicture(`src-${name}`, {
      display: tinyPicture(`display ${name}`),
      thumbnail: tinyPicture(`thumb ${name}`),
    });
  }
  const { clipOne, clipTwo } = VIDEO_CLIP_MARKERS;
  await store.putVideo("src-c1", new Blob([clipOne], { type: "video/mp4" }));
  await store.putVideo("src-c2", new Blob([clipTwo], { type: "video/webm" }));
  return exportSlideshow(VIDEO_SLIDESHOW, store, { modifiedAt: MODIFIED_AT });
}
