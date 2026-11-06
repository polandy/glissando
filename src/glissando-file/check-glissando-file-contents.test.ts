import { describe, expect, it } from "vitest";
import { DISPLAY_BOUND } from "../import/downscale";
import { MAX_MUSIC_BYTES } from "../import/music-limits";
import { checkGlissandoFile } from "./check-glissando-file";
import { MAX_MANIFEST_BYTES, MAX_THUMBNAIL_BYTES } from "./file-limits";
import {
  damagedReason,
  manifestText,
  plentyOfSpace,
  type ExportedManifest,
} from "./testing/check-fixtures";
import { fakeMediaDecoders } from "./testing/fake-media-decoders";
import { exportedFile, tinyPicture, zipWith } from "./testing/glissando-fixtures";

/** The song limit is built from this many equal blocks. */
const BLOCKS_IN_SONG_LIMIT = 200;

describe("checkGlissandoFile contents", () => {
  it("refuses a file with an entry name outside the format, naming it", async () => {
    const file = await zipWith({
      "glissando.json": await manifestText((m) => m),
      "pictures/0001.gif": "not an allowed extension",
    });

    const check = await checkGlissandoFile(file, plentyOfSpace);

    const reason = damagedReason(check);
    expect(reason).toContain("pictures/0001.gif");
    expect(reason).toContain("is not an entry name this format uses");
  });

  it("refuses a manifest over its size limit, naming the limit, before reading it", async () => {
    const file = await zipWith({ "glissando.json": "x".repeat(MAX_MANIFEST_BYTES + 1) });

    const check = await checkGlissandoFile(file, plentyOfSpace);

    expect(damagedReason(check)).toContain(`over the ${MAX_MANIFEST_BYTES} limit`);
  });

  it("refuses a thumbnail over its size limit, naming the entry and the limit", async () => {
    const manifest = JSON.parse(await manifestText((m) => m)) as ExportedManifest;
    const [first, second] = manifest.slideshow.pictures;
    const [song] = manifest.slideshow.songs;
    if (first === undefined || second === undefined || song === undefined) {
      throw new Error("the fixture manifest should have two pictures and a song");
    }
    const oversizedThumbnail = "x".repeat(MAX_THUMBNAIL_BYTES + 1);
    const file = await zipWith({
      "glissando.json": JSON.stringify(manifest),
      [first.file]: "display one",
      [first.thumbnail]: oversizedThumbnail,
      [second.file]: "display two",
      [second.thumbnail]: "thumb two",
      [song.file]: "music bytes",
    });

    const check = await checkGlissandoFile(file, plentyOfSpace);

    const reason = damagedReason(check);
    expect(reason).toContain(first.thumbnail);
    expect(reason).toContain(`over the ${MAX_THUMBNAIL_BYTES} limit`);
  });

  it("refuses a picture whose header is beyond the display bound, before decoding it", async () => {
    const manifest = JSON.parse(await manifestText((m) => m)) as ExportedManifest;
    const [first, second] = manifest.slideshow.pictures;
    const [song] = manifest.slideshow.songs;
    if (first === undefined || second === undefined || song === undefined) {
      throw new Error("the fixture manifest should have two pictures and a song");
    }
    const decoders = fakeMediaDecoders();
    const file = await zipWith({
      "glissando.json": JSON.stringify(manifest),
      [first.file]: tinyPicture("huge", 5000, 5000),
      [first.thumbnail]: "thumb one",
      [second.file]: "display two",
      [second.thumbnail]: "thumb two",
      [song.file]: "music bytes",
    });

    const check = await checkGlissandoFile(file, { ...plentyOfSpace, mediaDecoders: decoders });

    const reason = damagedReason(check);
    expect(reason).toContain("5000×5000");
    expect(reason).toContain(
      `beyond the ${DISPLAY_BOUND.longEdge}×${DISPLAY_BOUND.shortEdge} bound`,
    );
    expect(decoders.pictureCalls).toHaveLength(0);
  });

  it("refuses a display picture whose header size differs from the manifest's, naming both", async () => {
    const manifest = JSON.parse(await manifestText((m) => m)) as ExportedManifest;
    const [first, second] = manifest.slideshow.pictures;
    const [song] = manifest.slideshow.songs;
    if (first === undefined || second === undefined || song === undefined) {
      throw new Error("the fixture manifest should have two pictures and a song");
    }
    const file = await zipWith({
      "glissando.json": JSON.stringify(manifest),
      [first.file]: tinyPicture("display one", first.width + 10, first.height),
      [first.thumbnail]: tinyPicture("thumb one"),
      [second.file]: tinyPicture("display two", second.width, second.height),
      [second.thumbnail]: tinyPicture("thumb two"),
      [song.file]: "music bytes",
    });

    const check = await checkGlissandoFile(file, plentyOfSpace);

    const reason = damagedReason(check);
    expect(reason).toContain(`${first.width + 10}×${first.height}`);
    expect(reason).toContain(`not the ${first.width}×${first.height} the manifest declares`);
  });

  it("refuses a picture that does not decode, naming it, after calling the decoder", async () => {
    const decoders = fakeMediaDecoders({ refusePictureContaining: "display two" });

    const check = await checkGlissandoFile(await exportedFile(), {
      ...plentyOfSpace,
      mediaDecoders: decoders,
    });

    expect(damagedReason(check)).toContain("does not decode as a picture");
    expect(decoders.pictureCalls.length).toBeGreaterThan(0);
  });

  it("refuses a song over the music size limit, naming the entry and the limit", async () => {
    const manifest = JSON.parse(await manifestText((m) => m)) as ExportedManifest;
    const [first, second] = manifest.slideshow.pictures;
    const [song] = manifest.slideshow.songs;
    if (first === undefined || second === undefined || song === undefined) {
      throw new Error("the fixture manifest should have two pictures and a song");
    }
    // Repeats one block by reference, so the test never holds the song's bytes twice.
    const block = new Blob([new Uint8Array(MAX_MUSIC_BYTES / BLOCKS_IN_SONG_LIMIT)]);
    const oversizedSong = new Blob([...Array<Blob>(BLOCKS_IN_SONG_LIMIT).fill(block), "x"]);
    const file = await zipWith({
      "glissando.json": JSON.stringify(manifest),
      [first.file]: "display one",
      [first.thumbnail]: "thumb one",
      [second.file]: "display two",
      [second.thumbnail]: "thumb two",
      [song.file]: oversizedSong,
    });

    const check = await checkGlissandoFile(file, plentyOfSpace);

    const reason = damagedReason(check);
    expect(reason).toContain(song.file);
    expect(reason).toContain(`over the ${MAX_MUSIC_BYTES} limit`);
  });

  it("refuses a song that does not decode, naming it", async () => {
    const decoders = fakeMediaDecoders({ refuseMusicContaining: "music bytes" });

    const check = await checkGlissandoFile(await exportedFile(), {
      ...plentyOfSpace,
      mediaDecoders: decoders,
    });

    expect(damagedReason(check)).toContain("does not decode as music");
  });

  it("refuses a manifest naming a song's file as a picture's entry name", async () => {
    const file = await zipWith({
      "glissando.json": await manifestText((m) => {
        const manifest = m as { slideshow: { songs: { file: string }[] } };
        const songs = manifest.slideshow.songs.map((song) => ({
          ...song,
          file: "pictures/0001.jpg",
        }));
        return { ...manifest, slideshow: { ...manifest.slideshow, songs } };
      }),
    });

    const check = await checkGlissandoFile(file, plentyOfSpace);

    expect(damagedReason(check)).toContain("is not a valid music entry name");
  });

  it("accepts a README, the schema and the player, but refuses to serve them as media", async () => {
    const manifest = JSON.parse(await manifestText((m) => m)) as ExportedManifest;
    const [first, second] = manifest.slideshow.pictures;
    const [song] = manifest.slideshow.songs;
    if (first === undefined || second === undefined || song === undefined) {
      throw new Error("the fixture manifest should have two pictures and a song");
    }
    const file = await zipWith({
      "glissando.json": JSON.stringify(manifest),
      [first.file]: tinyPicture("display one", first.width, first.height),
      [first.thumbnail]: tinyPicture("thumb one"),
      [second.file]: tinyPicture("display two", second.width, second.height),
      [second.thumbnail]: tinyPicture("thumb two"),
      [song.file]: "music bytes",
      "README.txt": "\x00\x01garbage, not text\xff\xfe",
      "index.html": "<script>alert('should never run')</script>",
      "glissando.schema.json": "{ not json at all ] garbage \x00\xff",
    });

    const check = await checkGlissandoFile(file, plentyOfSpace);

    if (check.kind !== "ok") {
      throw new Error(`expected an ok check, got ${check.kind}`);
    }
    expect(check.contents.manifest.slideshow.title).toBe(manifest.slideshow.title);
    await expect(check.contents.media("README.txt")).rejects.toThrow();
    await expect(check.contents.media("index.html")).rejects.toThrow();
    await expect(check.contents.media("glissando.schema.json")).rejects.toThrow();
  });
});
