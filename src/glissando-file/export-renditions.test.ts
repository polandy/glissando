import { describe, expect, it } from "vitest";
import { DISPLAY_BOUND } from "../import/downscale";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { checkGlissandoFile, type GlissandoFileCheck } from "./check-glissando-file";
import { exportSlideshow } from "./export-slideshow";
import { MAX_THUMBNAIL_BYTES } from "./file-limits";
import type { GlissandoManifest } from "./glissando-manifest";
import { fakeMediaDecoders } from "./testing/fake-media-decoders";
import { EXPORT_OPTIONS, entryTexts, tinyPicture } from "./testing/glissando-fixtures";

/**
 * A server slideshow's picture as `link-immich-photos.ts` stores it: its size is Immich's (here
 * the placeholder for one Immich has not read), not its display picture's; its thumbnail is
 * whatever Immich serves.
 */
const SERVER_SLIDESHOW: StoredSlideshow = {
  id: "server-show",
  title: "Immich am Server",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: "asset-1",
      immichAssetId: "asset-1",
      capturedAt: "2025-09-30T10:00:00Z",
      width: DISPLAY_BOUND.longEdge,
      height: DISPLAY_BOUND.shortEdge,
      fileName: "IMG_0001.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  songs: [],
  secondsPerPicture: 5,
};

const DISPLAY = tinyPicture("display", 40, 30);
const MADE_THUMBNAIL = tinyPicture("made from the display", 16, 12);
/** Immich's "thumbnail" at a resolution its admin set above the format's 480-pixel bound. */
const LARGE_IMMICH_THUMBNAIL = tinyPicture("immich thumbnail", 1440, 1080);

const OPTIONS = { ...EXPORT_OPTIONS, makeThumbnail: async () => MADE_THUMBNAIL };

async function exported(display: Blob, thumbnail: Blob): Promise<Blob> {
  const store = new MemoryLibraryStore();
  await store.putPicture("asset-1", { display, thumbnail });
  return exportSlideshow(SERVER_SLIDESHOW, store, OPTIONS);
}

function opened(file: Blob): Promise<GlissandoFileCheck> {
  return checkGlissandoFile(file, {
    freeBytes: () => Promise.resolve(null),
    mediaDecoders: fakeMediaDecoders(),
  });
}

async function manifestOf(file: Blob): Promise<GlissandoManifest> {
  return JSON.parse((await entryTexts(file))["glissando.json"] ?? "") as GlissandoManifest;
}

describe("the pictures a .glissando file carries", () => {
  it("declare their display picture's own size, so a size the store only guessed still opens", async () => {
    const file = await exported(DISPLAY, tinyPicture("small thumbnail", 16, 12));

    const [picture] = (await manifestOf(file)).slideshow.pictures;
    expect(picture).toMatchObject({ width: 40, height: 30 });
    expect((await opened(file)).kind).toBe("ok");
  });

  it("reach the player page with the size the manifest declares", async () => {
    const store = new MemoryLibraryStore();
    await store.putPicture("asset-1", { display: DISPLAY, thumbnail: MADE_THUMBNAIL });
    const shown: StoredSlideshow[] = [];
    await exportSlideshow(SERVER_SLIDESHOW, store, {
      ...OPTIONS,
      playerPage: async (slideshow) => {
        shown.push(slideshow);
        return "<!doctype html>";
      },
    });

    expect(shown[0]?.pictures[0]).toMatchObject({ width: 40, height: 30 });
  });

  it("keep a thumbnail within the format's bound as it is", async () => {
    const file = await exported(DISPLAY, tinyPicture("small thumbnail", 16, 12));

    expect((await entryTexts(file))["thumbnails/0001.png"]).toContain("small thumbnail");
  });

  it("carry a thumbnail made from the display picture where the stored one is beyond the bound", async () => {
    const file = await exported(DISPLAY, LARGE_IMMICH_THUMBNAIL);

    const texts = await entryTexts(file);
    expect(texts["pictures/0001.png"]).toContain("display");
    expect(texts["thumbnails/0001.png"]).toContain("made from the display");
    expect((await opened(file)).kind).toBe("ok");
  });

  it("carry a made thumbnail where the stored one is over the thumbnail byte limit", async () => {
    const heavy = new Blob(
      [tinyPicture("heavy thumbnail", 16, 12), new Uint8Array(MAX_THUMBNAIL_BYTES)],
      {
        type: "image/png",
      },
    );
    const file = await exported(DISPLAY, heavy);

    expect((await entryTexts(file))["thumbnails/0001.png"]).toContain("made from the display");
    expect((await opened(file)).kind).toBe("ok");
  });

  it("carry a made thumbnail where the stored one is of a type the format does not hold", async () => {
    const avif = new Blob(["avif thumbnail"], { type: "image/avif" });
    const file = await exported(DISPLAY, avif);

    expect((await entryTexts(file))["thumbnails/0001.png"]).toContain("made from the display");
    expect((await opened(file)).kind).toBe("ok");
  });

  it("carry a made thumbnail where the stored one has no readable header", async () => {
    const file = await exported(DISPLAY, new Blob(["not a picture"], { type: "image/jpeg" }));

    expect((await entryTexts(file))["thumbnails/0001.png"]).toContain("made from the display");
    expect((await opened(file)).kind).toBe("ok");
  });

  it("fail the export where a display picture has no readable header", async () => {
    const headerless = new Blob(["no picture"], { type: "image/jpeg" });

    await expect(exported(headerless, MADE_THUMBNAIL)).rejects.toThrow(
      /no readable picture header/,
    );
  });
});
