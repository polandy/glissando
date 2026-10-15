import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { checkGlissandoFile, type CheckedGlissandoFile } from "./check-glissando-file";
import { GLISSANDO_FORMAT_VERSION } from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import { entryData, readZipDirectory } from "./stored-zip";
import { exportedVideoFile } from "./testing/glissando-fixtures";
import { writeGlissandoFile, type OpenStep, type WritePorts } from "./write-glissando-file";

const plentyOfSpace = { freeBytes: () => Promise.resolve(1e9) };

async function manifestOf(file: Blob): Promise<Record<string, unknown>> {
  const [first] = (await readZipDirectory(file)) ?? [];
  return JSON.parse(first ? await entryData(file, first).text() : "{}") as Record<string, unknown>;
}

async function checked(file?: Blob): Promise<CheckedGlissandoFile> {
  const check = await checkGlissandoFile(file ?? (await exportedVideoFile()), plentyOfSpace);
  if (check.kind !== "ok") {
    throw new Error(`the fixture should pass the check, got ${check.kind}`);
  }
  return check.contents;
}

function ports(store: WritePorts["store"]): WritePorts {
  let next = 0;
  return { store, newId: () => `new-${++next}`, now: () => new Date(0), log: () => undefined };
}

function withVideo(manifest: Record<string, unknown>, change: Record<string, unknown>): string {
  const show = manifest["slideshow"] as { pictures: { video: object }[] };
  const pictures = show.pictures.map((picture, index) =>
    index === 0 ? { ...picture, video: { ...picture.video, ...change } } : picture,
  );
  return JSON.stringify({ ...manifest, slideshow: { ...show, pictures } });
}

describe("video slides in a .glissando file", () => {
  it("writes format version 14 with each distinct clip once as videos/clip-<n>.<ext>", async () => {
    const file = await exportedVideoFile();

    const names = ((await readZipDirectory(file)) ?? []).map((entry) => entry.name);
    const manifest = await manifestOf(file);

    expect(GLISSANDO_FORMAT_VERSION).toBe(14);
    expect(manifest["formatVersion"]).toBe(14);
    expect(names.filter((name) => name.startsWith("videos/"))).toEqual([
      "videos/clip-1.mp4",
      "videos/clip-2.webm",
    ]);
    const { pictures } = manifest["slideshow"] as { pictures: { video: unknown }[] };
    expect(pictures.map(({ video }) => video)).toEqual([
      {
        file: "videos/clip-1.mp4",
        mimeType: "video/mp4",
        sourceMs: 20_000,
        startMs: 1000,
        endMs: 6000,
        volume: 60,
        duckMusic: false,
      },
      {
        file: "videos/clip-1.mp4",
        mimeType: "video/mp4",
        sourceMs: 20_000,
        startMs: 4000,
        endMs: 9000,
      },
      {
        file: "videos/clip-2.webm",
        mimeType: "video/webm",
        sourceMs: 20_000,
        startMs: 1000,
        endMs: 6000,
      },
    ]);
  });

  it("counts the clips' bytes in what the media need, once each", async () => {
    const contents = await checked();

    const others = ["a", "b", "c"].reduce(
      (sum, name) => sum + `display ${name}`.length + `thumb ${name}`.length,
      0,
    );
    expect(contents.mediaBytes).toBe(others + "clip one".length + "clip two".length);
  });

  it("stores each clip once under a fresh id and restores every slide's excerpt", async () => {
    const store = new MemoryLibraryStore();
    const steps: OpenStep[] = [];

    const created = await writeGlissandoFile(await checked(), ports(store), {
      existingTitles: [],
      signal: new AbortController().signal,
      onStep: (step) => steps.push(step),
    });

    const videos = created.pictures.map(({ video }) => video);
    expect(videos).toEqual([
      {
        mediaId: expect.any(String),
        sourceMs: 20_000,
        startMs: 1000,
        endMs: 6000,
        volume: 60,
        duckMusic: false,
      },
      { mediaId: expect.any(String), sourceMs: 20_000, startMs: 4000, endMs: 9000 },
      { mediaId: expect.any(String), sourceMs: 20_000, startMs: 1000, endMs: 6000 },
    ]);
    expect(videos[0]?.mediaId).toBe(videos[1]?.mediaId);
    expect(videos[0]?.mediaId).not.toBe(videos[2]?.mediaId);
    const first = await store.videoBlob(videos[0]?.mediaId ?? "");
    expect(await first.text()).toBe("clip one");
    expect(first.type).toBe("video/mp4");
    expect((await store.videoBlob(videos[2]?.mediaId ?? "")).type).toBe("video/webm");
    expect(
      steps.filter((step) => step.kind === "video").map((step) => [step.number, step.count]),
    ).toEqual([
      [1, 2],
      [2, 2],
    ]);
    expect(steps.at(-1)?.fraction).toBeGreaterThan(0.5);
  });

  it("stores nothing when a later clip fails to write", async () => {
    const store = new MemoryLibraryStore();
    let clips = 0;
    const failing: WritePorts["store"] = {
      claimMedia: (...args) => store.claimMedia(...args),
      putPicture: (...args) => store.putPicture(...args),
      putMusic: (...args) => store.putMusic(...args),
      putVideo: (id, blob) =>
        ++clips === 2 ? Promise.reject(new Error("quota")) : store.putVideo(id, blob),
      saveSlideshow: (...args) => store.saveSlideshow(...args),
      releaseClaim: (...args) => store.releaseClaim(...args),
      deleteUnreferencedMedia: (...args) => store.deleteUnreferencedMedia(...args),
    };

    await expect(
      writeGlissandoFile(await checked(), ports(failing), {
        existingTitles: [],
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("quota");

    expect(await store.listSlideshows()).toEqual([]);
    await expect(store.videoBlob("new-5")).rejects.toThrow();
  });

  it("refuses a file whose clip entry is missing, before anything is stored", async () => {
    const file = await exportedVideoFile();
    const manifest = await manifestOf(file);
    const { zipWith } = await import("./testing/glissando-fixtures");
    const withoutClips = await zipWith({ "glissando.json": JSON.stringify(manifest) });

    const check = await checkGlissandoFile(withoutClips, plentyOfSpace);

    expect(check).toMatchObject({ kind: "damaged" });
  });

  it("reads a version 13 file, which has no clips", async () => {
    const manifest = await manifestOf(await exportedVideoFile());
    const show = manifest["slideshow"] as { pictures: object[] };
    const pictures = show.pictures.map((picture) => ({ ...picture, video: undefined }));

    const reading = readManifest(
      JSON.stringify({ ...manifest, formatVersion: 13, slideshow: { ...show, pictures } }),
    );

    expect(reading.kind).toBe("ok");
  });

  it("takes a clip in a version 13 file for damaged", async () => {
    const manifest = await manifestOf(await exportedVideoFile());

    expect(readManifest(JSON.stringify({ ...manifest, formatVersion: 13 })).kind).toBe("damaged");
  });

  it.each([
    ["an excerpt beyond the clip", { endMs: 21_000 }, "slideshow.pictures[0].video.endMs"],
    ["a negative start", { startMs: -1 }, "slideshow.pictures[0].video.startMs"],
    ["a volume off its steps", { volume: 33 }, "slideshow.pictures[0].video.volume"],
    ["a duckMusic of true", { duckMusic: true }, "slideshow.pictures[0].video.duckMusic"],
    ["a clip length of zero", { sourceMs: 0 }, "slideshow.pictures[0].video.sourceMs"],
    ["no MIME type", { mimeType: "" }, "slideshow.pictures[0].video.mimeType"],
  ])("takes %s for damaged, naming the field", async (_, change, path) => {
    const manifest = await manifestOf(await exportedVideoFile());

    const reading = readManifest(withVideo(manifest, change));

    expect(reading).toMatchObject({ kind: "damaged" });
    expect(reading.kind === "damaged" && reading.reason).toContain(path);
  });

  it("takes two slides sharing a clip file but disagreeing on its type for damaged", async () => {
    const manifest = await manifestOf(await exportedVideoFile());
    const show = manifest["slideshow"] as { pictures: { video: object }[] };
    const pictures = show.pictures.map((picture, index) =>
      index === 1 ? { ...picture, video: { ...picture.video, mimeType: "video/webm" } } : picture,
    );

    const reading = readManifest(JSON.stringify({ ...manifest, slideshow: { ...show, pictures } }));

    expect(reading.kind).toBe("damaged");
  });
});
