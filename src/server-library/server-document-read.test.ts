import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { storedSlideshowFrom } from "./server-document";
import { SEQUENCE_BETWEEN_SONGS } from "../library/own-music";
import { readServerDocument, serverDocumentFor } from "./server-document";
import {
  ASSET_A,
  MUSIC_ID,
  slideshow,
  without,
  document,
  withSlideshow,
  withFirstPicture,
  readFails,
} from "./server-document-fixtures";

describe("readServerDocument", () => {
  it("reads back what serverDocumentFor wrote", () => {
    expect(readServerDocument(JSON.parse(JSON.stringify(document())))).toEqual(document());
  });

  it.each([
    [
      "another format",
      { format: "glissando" },
      'format: expected "glissando-server", got "glissando"',
    ],
    ["another version", { formatVersion: 1 }, "formatVersion: expected 3, got 1"],
    ["an unknown key", { extra: true }, "extra: expected one of format, formatVersion, slideshow"],
  ])("refuses %s at the root, naming path and value", (_case, change, reason) => {
    expect(readFails({ ...document(), ...change })).toContain(reason);
  });

  it("keeps the music's even picture changes through writing and reading", () => {
    const song = {
      id: MUSIC_ID,
      fileName: "Walzer.m4a",
      durationMs: 240000,
      mimeType: "audio/mp4",
    };
    const even: StoredSlideshow = { ...slideshow, songs: [{ ...song, pictureChanges: "even" }] };
    const written = serverDocumentFor(even);

    expect(written.slideshow.songs[0]).toMatchObject({ pictureChanges: "even" });
    expect(storedSlideshowFrom("server-show-1", readServerDocument(written)).songs).toEqual(
      even.songs,
    );
  });

  it("keeps the slideshow's own picture length through writing and reading", () => {
    const ownSeconds: StoredSlideshow = { ...slideshow, pictureLength: "seconds" };
    const written = serverDocumentFor(ownSeconds);

    expect(written.slideshow).toMatchObject({ pictureLength: "seconds" });
    expect(storedSlideshowFrom("server-show-1", readServerDocument(written)).pictureLength).toBe(
      "seconds",
    );
  });

  it("keeps betweenSongs through writing and reading", () => {
    const sequence: StoredSlideshow = { ...slideshow, betweenSongs: SEQUENCE_BETWEEN_SONGS };
    const written = serverDocumentFor(sequence);

    expect(storedSlideshowFrom("server-show-1", readServerDocument(written)).betweenSongs).toBe(
      "sequence",
    );
  });

  it("refuses a document that is no object", () => {
    expect(readFails([])).toBe("root: expected an object, got []");
  });

  it("refuses a picture without an immichAssetId", () => {
    const unlinked = without(document().slideshow.pictures[0] ?? {}, "immichAssetId");
    expect(readFails(withSlideshow({ pictures: [unlinked] }))).toBe(
      "slideshow.pictures[0].immichAssetId: expected a non-empty string, got undefined",
    );
  });

  it("refuses two pictures with the same immichAssetId, naming the second and the id", () => {
    const [first] = document().slideshow.pictures;
    expect(readFails(withSlideshow({ pictures: [first, first] }))).toBe(
      `slideshow.pictures[1].immichAssetId: expected an asset no other picture has, got "${ASSET_A}"`,
    );
  });

  it.each(["file", "thumbnail", "fileBytes"])("refuses a picture's %s", (key) => {
    expect(readFails(withFirstPicture({ [key]: "pictures/0001.jpg" }))).toContain(
      `slideshow.pictures[0].${key}: expected one of`,
    );
  });

  it("refuses a song without a musicId", () => {
    const [song] = document().slideshow.songs;
    const unnamed = without(song ?? {}, "musicId");
    expect(readFails(withSlideshow({ songs: [unnamed] }))).toBe(
      "slideshow.songs[0].musicId: expected a non-empty string, got undefined",
    );
  });

  it("refuses a song named by a file", () => {
    const [song] = document().slideshow.songs;
    expect(readFails(withSlideshow({ songs: [{ ...song, file: "music/track-1.m4a" }] }))).toContain(
      "slideshow.songs[0].file: expected one of",
    );
  });

  it("refuses two songs with the same musicId, naming the second and the id", () => {
    const [song] = document().slideshow.songs;
    expect(readFails(withSlideshow({ songs: [song, song] }))).toBe(
      `slideshow.songs[1].musicId: expected a music no other song has, got "${MUSIC_ID}"`,
    );
  });

  it("refuses a document that carries both music and songs, as an unknown key", () => {
    const [song] = document().slideshow.songs;
    expect(readFails(withSlideshow({ music: song }))).toContain("slideshow.music");
  });

  it.each([
    [
      { secondsPerPicture: 20 },
      "slideshow.secondsPerPicture: expected a number from 2 to 15, got 20",
    ],
    [{ pictures: [] }, "slideshow.pictures: expected at least one picture, got []"],
    [{ title: " " }, 'slideshow.title: expected a non-empty string, got " "'],
  ])("reads the slideshow with the manifest's field checks: %j", (change, reason) => {
    expect(readFails(withSlideshow(change))).toBe(reason);
  });

  it("reads a picture with the manifest's field checks", () => {
    expect(readFails(withFirstPicture({ durationMs: 8200 }))).toContain(
      "slideshow.pictures[0].durationMs: expected whole milliseconds from 2000 to 15000",
    );
  });

  it("refuses a document from before the playlist, naming its single music as an unknown key", () => {
    const written = document();
    const [song] = written.slideshow.songs;
    const legacy = JSON.parse(
      JSON.stringify({
        ...written,
        slideshow: { ...written.slideshow, songs: undefined, music: song },
      }),
    );

    expect(readFails(legacy)).toContain("slideshow.music");
  });

  it("refuses a document from before the playlist with no music, missing the required songs", () => {
    const written = serverDocumentFor({ ...slideshow, songs: [] });
    const legacy = JSON.parse(
      JSON.stringify({ ...written, slideshow: { ...written.slideshow, songs: undefined } }),
    );

    expect(readFails(legacy)).toContain("slideshow.songs");
  });
});
