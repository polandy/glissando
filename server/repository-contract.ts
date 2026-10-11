import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../src/beats/music-beats";
import type { ServerDocument } from "../src/server-library/server-document";
import type { LibraryRepository, MusicRecord, SlideshowRecord } from "./library-repository";

/** The behaviour every `LibraryRepository` adapter shares; each adapter's test runs it. */
export function describeLibraryRepositoryContract(
  adapter: string,
  createRepository: () => LibraryRepository,
): void {
  describe(`${adapter} LibraryRepository contract`, () => {
    it("finds a slideshow inserted, with its revision, creation time and document", () => {
      const repository = createRepository();
      repository.insertSlideshow(slideshow("show-a", 1000));
      expect(repository.findSlideshow("show-a")).toEqual(slideshow("show-a", 1000));
    });

    it("finds no slideshow under an id never inserted", () => {
      const repository = createRepository();
      repository.insertSlideshow(slideshow("show-a", 1000));
      expect(repository.findSlideshow("show-a")).toBeDefined();
      expect(repository.findSlideshow("show-b")).toBeUndefined();
    });

    it("lists the newest creation first, and of equal times the later inserted first", () => {
      const repository = createRepository();
      repository.insertSlideshow(slideshow("old", 1000));
      repository.insertSlideshow(slideshow("new", 3000));
      repository.insertSlideshow(slideshow("same-time-first", 2000));
      repository.insertSlideshow(slideshow("same-time-second", 2000));
      expect(repository.listSlideshows().map(({ id }) => id)).toEqual([
        "new",
        "same-time-second",
        "same-time-first",
        "old",
      ]);
    });

    it("replaces a slideshow's revision and document, keeping its creation time", () => {
      const repository = createRepository();
      repository.insertSlideshow(slideshow("show-a", 1000));
      const edited = documentTitled("Edited");
      repository.updateSlideshow("show-a", 2, edited);
      expect(repository.findSlideshow("show-a")).toEqual({
        id: "show-a",
        revision: 2,
        createdAt: 1000,
        document: edited,
      });
    });

    it("deletes a slideshow and keeps the others", () => {
      const repository = createRepository();
      repository.insertSlideshow(slideshow("show-a", 1000));
      repository.insertSlideshow(slideshow("show-b", 2000));
      repository.deleteSlideshow("show-a");
      expect(repository.listSlideshows().map(({ id }) => id)).toEqual(["show-b"]);
    });

    it("keeps music's bytes and content type", () => {
      const repository = createRepository();
      repository.insertMusic(music("music-a", 1000));
      expect(repository.findMusic("music-a")).toEqual(music("music-a", 1000));
      expect(repository.findMusic("music-b")).toBeUndefined();
    });

    it("deletes music and keeps the rest", () => {
      const repository = createRepository();
      repository.insertMusic(music("music-a", 1000));
      repository.insertMusic(music("music-b", 1000));
      repository.deleteMusic("music-a");
      expect(repository.findMusic("music-b")).toBeDefined();
      expect(repository.findMusic("music-a")).toBeUndefined();
    });

    it("finds no beats for music no device has listened to yet", () => {
      const repository = createRepository();
      repository.insertMusic(music("music-a", 1000));
      expect(repository.findMusicBeats("music-a")).toBeUndefined();
    });

    it("finds the beats put for a music", () => {
      const repository = createRepository();
      repository.insertMusic(music("music-a", 1000));
      const beats: MusicBeats = { kind: "beats", beatsMs: [0, 500, 1000], beatsPerMinute: 120 };
      repository.putMusicBeats("music-a", beats);
      expect(repository.findMusicBeats("music-a")).toEqual(beats);
    });

    it("replaces a music's beats on a later put", () => {
      const repository = createRepository();
      repository.insertMusic(music("music-a", 1000));
      repository.putMusicBeats("music-a", {
        kind: "beats",
        beatsMs: [0, 500],
        beatsPerMinute: 120,
      });
      repository.putMusicBeats("music-a", { kind: "none" });
      expect(repository.findMusicBeats("music-a")).toEqual({ kind: "none" });
    });

    it("deletes a music's beats with the music", () => {
      const repository = createRepository();
      repository.insertMusic(music("music-a", 1000));
      repository.putMusicBeats("music-a", { kind: "none" });
      repository.deleteMusic("music-a");
      expect(repository.findMusicBeats("music-a")).toBeUndefined();
    });

    it("knows music is referenced while a slideshow's document names it", () => {
      const repository = createRepository();
      repository.insertMusic(music("music-a", 1000));
      repository.insertMusic(music("music-b", 1000));
      repository.insertSlideshow({ ...slideshow("show-a", 1000), document: withMusic("music-a") });
      expect(repository.isMusicReferenced("music-a")).toBe(true);
      expect(repository.isMusicReferenced("music-b")).toBe(false);
      repository.deleteSlideshow("show-a");
      expect(repository.isMusicReferenced("music-a")).toBe(false);
    });

    it("names unreferenced music uploaded before a time", () => {
      const repository = createRepository();
      repository.insertMusic(music("referenced-old", 1000));
      repository.insertMusic(music("unreferenced-old", 1000));
      repository.insertMusic(music("unreferenced-new", 5000));
      repository.insertSlideshow({
        ...slideshow("show-a", 1000),
        document: withMusic("referenced-old"),
      });
      expect(repository.unreferencedMusicUploadedBefore(5000)).toEqual(["unreferenced-old"]);
    });

    it("names music whose grace period restarted only once it is idle again before a time", () => {
      const repository = createRepository();
      repository.insertMusic(music("released", 1000));
      repository.restartMusicGrace("released", 5000);
      expect(repository.unreferencedMusicUploadedBefore(5000)).toEqual([]);
      expect(repository.unreferencedMusicUploadedBefore(5001)).toEqual(["released"]);
    });

    it("keeps every write of a transaction that completes and returns its result", () => {
      const repository = createRepository();
      const result = repository.inTransaction(() => {
        repository.insertSlideshow(slideshow("show-a", 1000));
        repository.insertMusic(music("music-a", 1000));
        return "done";
      });
      expect(result).toBe("done");
      expect(repository.findSlideshow("show-a")).toBeDefined();
      expect(repository.findMusic("music-a")).toBeDefined();
    });

    it("undoes every write of a transaction that throws, and rethrows", () => {
      const repository = createRepository();
      repository.insertSlideshow(slideshow("kept", 1000));
      const failure = new Error("work failed");
      expect(() =>
        repository.inTransaction(() => {
          repository.insertSlideshow(slideshow("show-a", 2000));
          repository.updateSlideshow("kept", 2, documentTitled("Edited"));
          repository.insertMusic(music("music-a", 1000));
          throw failure;
        }),
      ).toThrow(failure);
      expect(repository.findSlideshow("kept")).toEqual(slideshow("kept", 1000));
      expect(repository.findSlideshow("show-a")).toBeUndefined();
      expect(repository.findMusic("music-a")).toBeUndefined();
    });
  });
}

function documentTitled(title: string): ServerDocument {
  return {
    format: "glissando-server",
    formatVersion: 1,
    slideshow: {
      title,
      createdAt: "2025-10-01T08:00:00.000Z",
      secondsPerPicture: 5,
      pictures: [
        {
          capturedAt: "2025-09-30T10:00:00Z",
          width: 1920,
          height: 1080,
          fileName: "a.jpg",
          immichAssetId: "0b5a7c3e-1f2d-4e6a-9b8c-7d6e5f4a3b2c",
        },
      ],
      songs: [],
    },
  };
}

function withMusic(musicId: string): ServerDocument {
  const document = documentTitled("With music");
  const trackMusic = { musicId, fileName: "track.m4a", durationMs: 60000, mimeType: "audio/mp4" };
  return { ...document, slideshow: { ...document.slideshow, songs: [trackMusic] } };
}

function slideshow(id: string, createdAt: number): SlideshowRecord {
  return { id, revision: 1, createdAt, document: documentTitled(`Slideshow ${id}`) };
}

function music(id: string, uploadedAt: number): MusicRecord {
  return { id, contentType: "audio/mp4", bytes: new Uint8Array([1, 2, 3]), uploadedAt };
}
