import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { exportSlideshow, glissandoFileName } from "./export-slideshow";
import { readManifest } from "./read-manifest";
import { entryData, readZipDirectory } from "./stored-zip";

const MODIFIED = new Date("2025-10-01T08:00:00Z");

const slideshow: StoredSlideshow = {
  id: "show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    { id: "p2", capturedAt: "2025-09-30T11:00:00Z", width: 40, height: 30, fileName: "b.jpg" },
    { id: "p1", capturedAt: "2025-09-30T10:00:00Z", width: 40, height: 30, fileName: "a.jpg" },
  ],
  music: { id: "m1", fileName: "Walzer.m4a", durationMs: 240000, mimeType: "audio/mp4" },
  secondsPerPicture: 5,
};

const jpeg = (content: string): Blob => new Blob([content], { type: "image/jpeg" });

async function storeWithMedia(): Promise<MemoryLibraryStore> {
  const store = new MemoryLibraryStore();
  await store.putPicture("p1", { display: jpeg("display one"), thumbnail: jpeg("thumb one") });
  await store.putPicture("p2", { display: jpeg("display two"), thumbnail: jpeg("thumb two") });
  await store.putMusic("m1", new Blob(["music bytes"], { type: "audio/mp4" }));
  return store;
}

async function contents(file: Blob): Promise<Record<string, string>> {
  const entries = (await readZipDirectory(file)) ?? [];
  const read: Record<string, string> = {};
  for (const entry of entries) {
    read[entry.name] = await entryData(file, entry).text();
  }
  return read;
}

describe("exportSlideshow", () => {
  it("writes the manifest first, then each picture in play order, its thumbnail and the music", async () => {
    const file = await exportSlideshow(slideshow, await storeWithMedia(), { modifiedAt: MODIFIED });

    const read = await contents(file);
    expect(Object.keys(read)).toEqual([
      "glissando.json",
      "pictures/0001.jpg",
      "thumbnails/0001.jpg",
      "pictures/0002.jpg",
      "thumbnails/0002.jpg",
      "music/track.m4a",
    ]);
    expect(read["pictures/0001.jpg"]).toBe("display two");
    expect(read["thumbnails/0002.jpg"]).toBe("thumb one");
    expect(read["music/track.m4a"]).toBe("music bytes");
    const manifest = readManifest(read["glissando.json"] ?? "");
    expect(manifest.kind === "ok" && manifest.manifest.slideshow.title).toBe("Herbst in Wien");
  });

  it("carries no picture's focus, even one stored on this device (ADR-0012)", async () => {
    const store = await storeWithMedia();
    await store.putPictureFocus("p1", {
      kind: "subject",
      box: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 },
    });
    expect((await store.pictureFocus(["p1"])).has("p1")).toBe(true);

    const file = await exportSlideshow(slideshow, store, { modifiedAt: MODIFIED });

    const json = (await contents(file))["glissando.json"] ?? "";
    expect(json).toContain('"capturedAt"');
    expect(json).not.toMatch(/focus|"box"/i);
  });

  it("reports progress per media file up to all of them", async () => {
    const reported: number[] = [];
    await exportSlideshow(slideshow, await storeWithMedia(), {
      modifiedAt: MODIFIED,
      onProgress: (fraction) => reported.push(fraction),
    });
    expect(reported.at(-1)).toBe(1);
    expect(reported).toEqual([...reported].sort((a, b) => a - b));
    expect(reported.length).toBeGreaterThan(2);
  });

  it("fails with the store's error when a picture is missing", async () => {
    const store = await storeWithMedia();
    const gone = {
      id: "gone",
      capturedAt: "2025-09-30T11:00:00Z",
      width: 4,
      height: 3,
      fileName: "",
    };
    const broken = { ...slideshow, pictures: [gone] };
    await expect(exportSlideshow(broken, store, { modifiedAt: MODIFIED })).rejects.toThrow(/gone/);
  });
});

describe("glissandoFileName", () => {
  it.each([
    ["Herbst in Wien", "Herbst in Wien.glissando"],
    ["Juli–August 2025", "Juli–August 2025.glissando"],
    ['a/b\\c:d*e?f"g<h>i|j', "a-b-c-d-e-f-g-h-i-j.glissando"],
    ["  .hidden. ", "hidden.glissando"],
    ["///", "Glissando.glissando"],
  ])("makes %j a safe file name", (title, expected) => {
    expect(glissandoFileName(title)).toBe(expected);
  });
});
