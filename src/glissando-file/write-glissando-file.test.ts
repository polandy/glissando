import { describe, expect, it } from "vitest";
import { MediaNotFoundError } from "../library/stored-slideshow";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { checkGlissandoFile, type CheckedGlissandoFile } from "./check-glissando-file";
import { EXPORTED_SLIDESHOW, exportedFile } from "./testing/glissando-fixtures";
import { writeGlissandoFile, type OpenStep, type WritePorts } from "./write-glissando-file";

const NOW = new Date("2026-01-02T03:04:05Z");

async function checked(): Promise<CheckedGlissandoFile> {
  const check = await checkGlissandoFile(await exportedFile(), {
    freeBytes: () => Promise.resolve(null),
  });
  if (check.kind !== "ok") {
    throw new Error(`the fixture should pass the check, got ${check.kind}`);
  }
  return check.contents;
}

function counter(): () => string {
  let next = 0;
  return () => `new-${++next}`;
}

async function storeWithOtherShow(): Promise<MemoryLibraryStore> {
  const store = new MemoryLibraryStore();
  await store.putPicture("kept", { display: new Blob(["k"]), thumbnail: new Blob(["k"]) });
  await store.saveSlideshow({
    id: "other",
    title: "Herbst in Wien",
    createdAt: "2025-01-01T00:00:00Z",
    pictures: [
      { id: "kept", capturedAt: "2025-01-01T00:00:00Z", width: 1, height: 1, fileName: "k" },
    ],
    secondsPerPicture: 5,
  });
  return store;
}

function ports(store: WritePorts["store"]): WritePorts {
  return { store, newId: counter(), now: () => NOW, log: () => undefined };
}

describe("writeGlissandoFile", () => {
  it("stores a new slideshow with fresh ids, the file's order, settings and media", async () => {
    const store = new MemoryLibraryStore();
    const created = await writeGlissandoFile(await checked(), ports(store), {
      existingTitles: [],
      signal: new AbortController().signal,
    });

    const saved = await store.getSlideshow(created.id);
    expect(saved).toEqual(created);
    expect(saved.title).toBe("Herbst in Wien");
    expect(saved.createdAt).toBe(NOW.toISOString());
    expect(saved.ownOrder).toBe(true);
    expect(saved.secondsPerPicture).toBe(5);
    expect(saved.pictures.map((picture) => picture.fileName)).toEqual(["b.jpg", "a.jpg"]);
    expect(saved.pictures.map((picture) => picture.id)).not.toContain("src-p2");
    const [first] = saved.pictures;
    expect(first && (await (await store.pictureBlob(first.id)).text())).toBe("display two");
    expect(first && (await store.thumbnailBlob(first.id)).type).toBe("image/jpeg");
    const music = saved.music;
    expect(music && (await (await store.musicBlob(music.id)).text())).toBe("music bytes");
    expect(music?.fileName).toBe("Walzer.m4a");
  });

  it("keeps the music's excerpt and own fades, and leaves the other fade automatic", async () => {
    const store = new MemoryLibraryStore();
    const created = await writeGlissandoFile(await checked(), ports(store), {
      existingTitles: [],
      signal: new AbortController().signal,
    });

    expect(created.music?.trim).toEqual({ startMs: 12_000, endMs: 200_000 });
    expect(created.music?.fadeOutMs).toBe(5000);
    expect(created.music).not.toHaveProperty("fadeInMs");
  });

  it("keeps each picture's own motion and leaves the automatic ones automatic", async () => {
    const store = new MemoryLibraryStore();
    const created = await writeGlissandoFile(await checked(), ports(store), {
      existingTitles: [],
      signal: new AbortController().signal,
    });

    const [automatic, own] = (await store.getSlideshow(created.id)).pictures;
    expect(own?.kenBurns).toEqual(EXPORTED_SLIDESHOW.pictures[1]?.kenBurns);
    expect(automatic?.fileName).toBe("b.jpg");
    expect(automatic).not.toHaveProperty("kenBurns");
  });

  it("keeps each picture's caption and leaves the others without", async () => {
    const store = new MemoryLibraryStore();
    const created = await writeGlissandoFile(await checked(), ports(store), {
      existingTitles: [],
      signal: new AbortController().signal,
    });

    const [captioned, without] = (await store.getSlideshow(created.id)).pictures;
    expect(captioned?.caption).toBe("Am Steg");
    expect(without?.fileName).toBe("a.jpg");
    expect(without).not.toHaveProperty("caption");
  });

  it("keeps each picture's own duration and transition and leaves the others automatic", async () => {
    const store = new MemoryLibraryStore();
    const created = await writeGlissandoFile(await checked(), ports(store), {
      existingTitles: [],
      signal: new AbortController().signal,
    });

    const [own, automatic] = (await store.getSlideshow(created.id)).pictures;
    expect(own).toMatchObject({ durationMs: 8000, transition: "dissolve" });
    expect(automatic?.fileName).toBe("a.jpg");
    expect(automatic).not.toHaveProperty("durationMs");
    expect(automatic).not.toHaveProperty("transition");
  });

  it("keeps the slideshow's default transition", async () => {
    const store = new MemoryLibraryStore();
    const created = await writeGlissandoFile(await checked(), ports(store), {
      existingTitles: [],
      signal: new AbortController().signal,
    });

    expect((await store.getSlideshow(created.id)).transition).toBe("alternate");
  });

  it("never overwrites: a clashing title gets a number, the other slideshow stays", async () => {
    const store = await storeWithOtherShow();
    const created = await writeGlissandoFile(await checked(), ports(store), {
      existingTitles: ["Herbst in Wien"],
      signal: new AbortController().signal,
    });
    expect(created.title).toBe("Herbst in Wien (2)");
    expect((await store.getSlideshow("other")).title).toBe("Herbst in Wien");
  });

  it("names each step: every picture of the count, then the music", async () => {
    const steps: OpenStep[] = [];
    await writeGlissandoFile(await checked(), ports(new MemoryLibraryStore()), {
      existingTitles: [],
      signal: new AbortController().signal,
      onStep: (step) => steps.push(step),
    });
    expect(steps).toEqual([
      { kind: "picture", number: 1, count: 2, fraction: 0 },
      { kind: "picture", number: 2, count: 2, fraction: 0.4 },
      { kind: "music", fraction: 0.8 },
    ]);
  });

  it("cancelled midway, removes everything it wrote and saves no slideshow", async () => {
    const store = await storeWithOtherShow();
    const cancel = new AbortController();
    const writing = writeGlissandoFile(await checked(), ports(store), {
      existingTitles: [],
      signal: cancel.signal,
      onStep: (step) => {
        if (step.kind === "picture" && step.number === 2) {
          cancel.abort();
        }
      },
    });

    await expect(writing).rejects.toMatchObject({ name: "AbortError" });
    expect(await (await store.pictureBlob("kept")).text()).toBe("k");
    await expect(store.pictureBlob("new-2")).rejects.toThrow(MediaNotFoundError);
    expect((await store.listSlideshows()).map((show) => show.id)).toEqual(["other"]);
  });

  it("when storage runs full midway, removes everything it wrote and fails with that error", async () => {
    const store = await storeWithOtherShow();
    const quota = new DOMException("full", "QuotaExceededError");
    let pictures = 0;
    const filling: WritePorts["store"] = {
      claimMedia: (claimId, startedAt, mediaId) => store.claimMedia(claimId, startedAt, mediaId),
      putPicture: (id, blobs) =>
        ++pictures === 2 ? Promise.reject(quota) : store.putPicture(id, blobs),
      putMusic: (id, blob) => store.putMusic(id, blob),
      saveSlideshow: (slideshow) => store.saveSlideshow(slideshow),
      releaseClaim: (claimId) => store.releaseClaim(claimId),
      deleteUnreferencedMedia: (now) => store.deleteUnreferencedMedia(now),
    };

    const writing = writeGlissandoFile(await checked(), ports(filling), {
      existingTitles: [],
      signal: new AbortController().signal,
    });

    await expect(writing).rejects.toBe(quota);
    expect(await (await store.pictureBlob("kept")).text()).toBe("k");
    await expect(store.pictureBlob("new-2")).rejects.toThrow(MediaNotFoundError);
    expect((await store.listSlideshows()).map((show) => show.id)).toEqual(["other"]);
  });
});
