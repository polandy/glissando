import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../src/beats/music-beats";
import type { MusicLoudness } from "../src/loudness/measure-loudness";
import { musicLoudnessToJson } from "../src/loudness/music-loudness-json";
import type { StoredFocus } from "../src/library/picture-focus";
import {
  SERVER_DOCUMENT_FORMAT_VERSION,
  type ServerDocument,
} from "../src/server-library/server-document";
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

    it("finds no share link for a slideshow never shared", () => {
      const repository = createRepository();
      repository.insertSlideshow(slideshow("show-a", 1000));
      expect(repository.findSlideshow("show-a")).toBeDefined();
      expect(repository.shareOf("show-a")).toBeUndefined();
    });

    it("finds a slideshow's share link by the slideshow and the slideshow by its token", () => {
      const repository = createRepository();
      repository.insertSlideshow(slideshow("show-a", 1000));
      repository.insertSlideshow(slideshow("show-b", 2000));
      repository.share("show-a", { token: TOKEN_A, createdAt: 5000 });
      expect(repository.shareOf("show-a")).toEqual({ token: TOKEN_A, createdAt: 5000 });
      expect(repository.shareOf("show-b")).toBeUndefined();
      expect(repository.slideshowByShareToken(TOKEN_A)).toEqual(slideshow("show-a", 1000));
      expect(repository.slideshowByShareToken(TOKEN_B)).toBeUndefined();
    });

    it("finds the slideshow by its token with its current revision and document", () => {
      const repository = createRepository();
      repository.insertSlideshow(slideshow("show-a", 1000));
      repository.share("show-a", { token: TOKEN_A, createdAt: 5000 });
      repository.updateSlideshow("show-a", 2, documentTitled("Edited"));
      expect(repository.slideshowByShareToken(TOKEN_A)).toMatchObject({
        revision: 2,
        document: documentTitled("Edited"),
      });
    });

    it("deletes a share link on unshare, keeping the slideshow and other links", () => {
      const repository = createRepository();
      repository.insertSlideshow(slideshow("show-a", 1000));
      repository.insertSlideshow(slideshow("show-b", 2000));
      repository.share("show-a", { token: TOKEN_A, createdAt: 5000 });
      repository.share("show-b", { token: TOKEN_B, createdAt: 5000 });
      repository.unshare("show-a");
      expect(repository.findSlideshow("show-a")).toBeDefined();
      expect(repository.shareOf("show-b")).toBeDefined();
      expect(repository.shareOf("show-a")).toBeUndefined();
      expect(repository.slideshowByShareToken(TOKEN_A)).toBeUndefined();
    });

    it("deletes a slideshow's share link with the slideshow", () => {
      const repository = createRepository();
      repository.insertSlideshow(slideshow("show-a", 1000));
      repository.insertSlideshow(slideshow("show-b", 2000));
      repository.share("show-a", { token: TOKEN_A, createdAt: 5000 });
      repository.share("show-b", { token: TOKEN_B, createdAt: 5000 });
      repository.deleteSlideshow("show-a");
      expect(repository.slideshowByShareToken(TOKEN_B)).toBeDefined();
      expect(repository.slideshowByShareToken(TOKEN_A)).toBeUndefined();
      repository.insertSlideshow(slideshow("show-a", 1000));
      expect(repository.shareOf("show-a")).toBeUndefined();
    });

    it("undoes a share link made in a transaction that throws", () => {
      const repository = createRepository();
      repository.insertSlideshow(slideshow("show-a", 1000));
      expect(() =>
        repository.inTransaction(() => {
          repository.share("show-a", { token: TOKEN_A, createdAt: 5000 });
          throw new Error("work failed");
        }),
      ).toThrow("work failed");
      expect(repository.findSlideshow("show-a")).toBeDefined();
      expect(repository.shareOf("show-a")).toBeUndefined();
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

    it("finds no loudness for music not measured yet", () => {
      const repository = createRepository();
      repository.insertMusic(music("music-a", 1000));
      expect(repository.findMusicLoudness("music-a")).toBeUndefined();
    });

    it("finds the loudness put for a music", () => {
      const repository = createRepository();
      repository.insertMusic(music("music-a", 1000));
      const loudness = loudnessOf([0.01, 0.02], [0.5, 0.6, 0.7, 0.8, 0.9]);
      repository.putMusicLoudness("music-a", loudness);
      expectSameLoudness(repository.findMusicLoudness("music-a"), loudness);
    });

    it("replaces a music's loudness on a later put", () => {
      const repository = createRepository();
      repository.insertMusic(music("music-a", 1000));
      repository.putMusicLoudness("music-a", loudnessOf([0.01], [0.1, 0.2, 0.3, 0.4]));
      const relevelled = loudnessOf([0.02], [0.2, 0.3, 0.4, 0.5]);
      repository.putMusicLoudness("music-a", relevelled);
      expectSameLoudness(repository.findMusicLoudness("music-a"), relevelled);
    });

    it("deletes a music's loudness with the music", () => {
      const repository = createRepository();
      repository.insertMusic(music("music-a", 1000));
      repository.putMusicLoudness("music-a", loudnessOf([0.01], [0.1, 0.2, 0.3, 0.4]));
      repository.deleteMusic("music-a");
      expect(repository.findMusicLoudness("music-a")).toBeUndefined();
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

    it("finds no focus for a picture asset id never stored", () => {
      const repository = createRepository();
      expect(repository.findPictureFocus([PICTURE_ASSET_ID])).toEqual(new Map());
    });

    it("finds the focus stored for a picture, among the asset ids asked for", () => {
      const repository = createRepository();
      const focus = storedFocus(1);
      expect(repository.putPictureFocus(PICTURE_ASSET_ID, focus, 1000)).toBe("stored");
      expect(repository.findPictureFocus([PICTURE_ASSET_ID, "unasked-for"])).toEqual(
        new Map([[PICTURE_ASSET_ID, focus]]),
      );
    });

    it("replaces a picture's focus when the stored detector is at most the new one", () => {
      const repository = createRepository();
      repository.putPictureFocus(PICTURE_ASSET_ID, storedFocus(1), 1000);
      const refound = storedFocus(1);
      expect(repository.putPictureFocus(PICTURE_ASSET_ID, refound, 2000)).toBe("stored");
      expect(repository.findPictureFocus([PICTURE_ASSET_ID])).toEqual(
        new Map([[PICTURE_ASSET_ID, refound]]),
      );
    });

    it("keeps a picture's focus when the stored detector is newer than the new one", () => {
      const repository = createRepository();
      const newer = storedFocus(2);
      repository.putPictureFocus(PICTURE_ASSET_ID, newer, 1000);
      expect(repository.putPictureFocus(PICTURE_ASSET_ID, storedFocus(1), 2000)).toBe("newerKept");
      expect(repository.findPictureFocus([PICTURE_ASSET_ID])).toEqual(
        new Map([[PICTURE_ASSET_ID, newer]]),
      );
    });

    it("knows a picture is referenced while a slideshow's document names it", () => {
      const repository = createRepository();
      expect(repository.isPictureReferenced(PICTURE_ASSET_ID)).toBe(false);
      repository.insertSlideshow(slideshow("show-a", 1000));
      expect(repository.isPictureReferenced(PICTURE_ASSET_ID)).toBe(true);
      repository.deleteSlideshow("show-a");
      expect(repository.isPictureReferenced(PICTURE_ASSET_ID)).toBe(false);
    });

    it("deletes a picture's stored focus", () => {
      const repository = createRepository();
      repository.putPictureFocus(PICTURE_ASSET_ID, storedFocus(1), 1000);
      repository.deletePictureFocus(PICTURE_ASSET_ID);
      expect(repository.findPictureFocus([PICTURE_ASSET_ID])).toEqual(new Map());
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

const TOKEN_A = "AAAAAAAAAAAAAAAAAAAAAA";
const TOKEN_B = "BBBBBBBBBBBBBBBBBBBBBB";
// The asset id every `documentTitled` picture names, so a slideshow always references it.
const PICTURE_ASSET_ID = "0b5a7c3e-1f2d-4e6a-9b8c-7d6e5f4a3b2c";

function documentTitled(title: string): ServerDocument {
  return {
    format: "glissando-server",
    formatVersion: SERVER_DOCUMENT_FORMAT_VERSION,
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
          colours: { veil: "#404040", accent: "#C0C0C0" },
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

function storedFocus(detector: number): StoredFocus {
  return { focus: { kind: "none" }, detector };
}

function loudnessOf(blockMeanSquares: number[], hopPeaks: number[]): MusicLoudness {
  return {
    blockMeanSquares: Float32Array.from(blockMeanSquares),
    hopPeaks: Float32Array.from(hopPeaks),
  };
}

/**
 * Compares through the compact dB/dBFS wire form (ADR-0021 style), since the sqlite adapter
 * rounds to 0.01 dB on the way in; the exact linear values an adapter kept are not the point.
 */
function expectSameLoudness(actual: MusicLoudness | undefined, expected: MusicLoudness): void {
  expect(actual).toBeDefined();
  expect(musicLoudnessToJson(actual as MusicLoudness)).toEqual(musicLoudnessToJson(expected));
}
