import { describe, expect, it } from "vitest";
import type { StoredPicture } from "../library/stored-slideshow";
import { SEQUENCE_BETWEEN_SONGS } from "../library/own-music";
import { serverDocumentFor } from "./server-document";
import {
  ASSET_A,
  MUSIC_ID,
  slideshow,
  firstStoredPicture,
  document,
} from "./server-document-fixtures";

describe("serverDocumentFor", () => {
  it("names the server format and version 3 and links every picture by its Immich asset", () => {
    const written = document();
    expect(written.format).toBe("glissando-server");
    expect(written.formatVersion).toBe(3);
    expect(written.slideshow.pictures[0]).toEqual({
      capturedAt: "2025-09-30T10:00:00Z",
      width: 3840,
      height: 2160,
      fileName: "a.jpg",
      caption: "Am Steg",
      immichAssetId: ASSET_A,
      colours: { veil: "#404040", accent: "#C0C0C0" },
    });
  });

  it("names each song of the playlist by its musicId, the stored music's id", () => {
    expect(document().slideshow.songs).toEqual([
      {
        musicId: MUSIC_ID,
        fileName: "Walzer.m4a",
        durationMs: 240000,
        mimeType: "audio/mp4",
        fadeInMs: 2000,
      },
    ]);
  });

  it("writes an empty playlist, not an absent one, for a slideshow without music", () => {
    expect(serverDocumentFor({ ...slideshow, songs: [] }).slideshow.songs).toEqual([]);
  });

  it("carries betweenSongs only when the slideshow plays its songs one after another", () => {
    const written = serverDocumentFor({ ...slideshow, betweenSongs: SEQUENCE_BETWEEN_SONGS });
    expect(written.slideshow.betweenSongs).toBe("sequence");
    expect(document().slideshow).not.toHaveProperty("betweenSongs");
  });

  it("leaves out a picture's file size, which a linked picture does not have", () => {
    const sized = { ...firstStoredPicture, fileBytes: 4200000 };
    const written = serverDocumentFor({ ...slideshow, pictures: [sized] });
    expect(written.slideshow.pictures[0]).not.toHaveProperty("fileBytes");
  });

  it("refuses a picture without an Immich asset, naming it", () => {
    const { id, capturedAt, width, height, fileName, colours } = firstStoredPicture;
    const devicePicture: StoredPicture = { id, capturedAt, width, height, fileName, colours };
    expect(() => serverDocumentFor({ ...slideshow, pictures: [devicePicture] })).toThrow(
      /picture .*a\.jpg.* has no immichAssetId/,
    );
  });
});
