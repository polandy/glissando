import { describe, expect, it } from "vitest";
import { GREY_PICTURE_COLOURS, pictureColours, type RgbPixel } from "./picture-colours";
import { rebuildBlackPosters, type PosterRebuildPorts, type RebuiltPoster } from "./poster-rebuild";
import type { StoredPicture } from "./stored-slideshow";
import { picture, slideshow } from "./testing/library-store-contract";
import { MemoryLibraryStore } from "./testing/memory-store";

const BLACK: RgbPixel = { r: 0, g: 0, b: 0 };
const DARK_RED: RgbPixel = { r: 90, g: 10, b: 10 };
const LIT_COLOURS = { veil: "#402020", accent: "#E0A0A0" };
/** What the fake samples off a rebuilt poster: two dark red pixels. */
const REBUILT_COLOURS = pictureColours([DARK_RED, DARK_RED]);

/** A stored picture whose sampled pixels are all `pixel`; the fake `pixels` reads it back. */
const pictureOf = (label: string, pixel: RgbPixel): Blob =>
  new Blob([JSON.stringify({ label, pixel })], { type: "image/jpeg" });

const labelOf = async (blob: Blob): Promise<string> =>
  (JSON.parse(await blob.text()) as { label: string }).label;

function videoPicture(id: string, colours = GREY_PICTURE_COLOURS): StoredPicture {
  return {
    ...picture(id),
    width: 1920,
    height: 1080,
    colours,
    video: { mediaId: `${id}-clip`, sourceMs: 8000, startMs: 0, endMs: 8000 },
  };
}

interface Harness {
  readonly store: MemoryLibraryStore;
  readonly ports: PosterRebuildPorts;
  readonly decodedClips: string[];
  readonly sampled: string[];
  readonly rebuilt: string[][];
  readonly logged: unknown[];
}

/**
 * A store holding `pictures` in one slideshow, each picture's stored rendition as given and each
 * clip decoding to the poster `posters` names (its first frame is black where that is BLACK).
 */
async function harness(
  pictures: readonly { picture: StoredPicture; stored: RgbPixel }[],
  posters: Record<string, RgbPixel | Error> = {},
): Promise<Harness> {
  const store = new MemoryLibraryStore();
  for (const { picture: stored, stored: pixel } of pictures) {
    const blob = pictureOf(`${stored.id} stored`, pixel);
    await store.putPicture(stored.id, { display: blob, thumbnail: blob });
    if (stored.video !== undefined) {
      await store.putVideo(stored.video.mediaId, new Blob([stored.video.mediaId]));
    }
  }
  await store.saveSlideshow(slideshow({ pictures: pictures.map(({ picture: p }) => p) }));
  const decodedClips: string[] = [];
  const sampled: string[] = [];
  const rebuilt: string[][] = [];
  const logged: unknown[] = [];
  const ports: PosterRebuildPorts = {
    store,
    pixels: async (blob) => {
      const { label, pixel } = JSON.parse(await blob.text()) as { label: string; pixel: RgbPixel };
      sampled.push(label);
      return [pixel, pixel];
    },
    poster: async (clip, fileName): Promise<RebuiltPoster> => {
      const mediaId = await clip.text();
      decodedClips.push(`${mediaId} as ${fileName}`);
      const poster = posters[mediaId];
      if (poster instanceof Error) {
        throw poster;
      }
      const blob = pictureOf(`${mediaId} poster`, poster ?? DARK_RED);
      return { display: blob, thumbnail: blob, width: 1280, height: 720 };
    },
    onRebuilt: (ids) => rebuilt.push([...ids]),
    log: (error) => logged.push(error),
  };
  return { store, ports, decodedClips, sampled, rebuilt, logged };
}

describe("rebuildBlackPosters", () => {
  it("rebuilds a video slide's black poster from its stored clip, with its colours and size", async () => {
    const h = await harness([{ picture: videoPicture("clip"), stored: BLACK }]);

    await rebuildBlackPosters(h.ports);

    expect(await labelOf(await h.store.pictureBlob("clip"))).toBe("clip-clip poster");
    expect(await labelOf(await h.store.thumbnailBlob("clip"))).toBe("clip-clip poster");
    const [stored] = (await h.store.getSlideshow("show-1")).pictures;
    expect(stored).toMatchObject({ colours: REBUILT_COLOURS, width: 1280, height: 720 });
    expect(stored?.video).toEqual(videoPicture("clip").video);
    expect(h.decodedClips).toEqual(["clip-clip as clip.jpg"]);
    expect(h.rebuilt).toEqual([["clip"]]);
  });

  it("leaves a video slide whose poster shows a picture, without reading it when its colours are lit", async () => {
    const h = await harness([
      { picture: videoPicture("black"), stored: BLACK },
      { picture: videoPicture("dark-grey"), stored: DARK_RED },
      { picture: videoPicture("lit", LIT_COLOURS), stored: DARK_RED },
    ]);

    await rebuildBlackPosters(h.ports);

    expect(h.decodedClips).toEqual(["black-clip as black.jpg"]);
    expect(h.sampled).toEqual(["black stored", "black-clip poster", "dark-grey stored"]);
    expect(await labelOf(await h.store.pictureBlob("dark-grey"))).toBe("dark-grey stored");
    expect(await labelOf(await h.store.pictureBlob("lit"))).toBe("lit stored");
  });

  it("leaves a black picture that is no video slide", async () => {
    const plain = { ...picture("plain"), colours: GREY_PICTURE_COLOURS };
    const h = await harness([
      { picture: videoPicture("clip"), stored: BLACK },
      { picture: plain, stored: BLACK },
    ]);

    await rebuildBlackPosters(h.ports);

    expect(h.rebuilt).toEqual([["clip"]]);
    expect(h.sampled).toEqual(["clip stored", "clip-clip poster"]);
    expect(await labelOf(await h.store.pictureBlob("plain"))).toBe("plain stored");
  });

  it("keeps the stored poster when the clip's first frame is black too", async () => {
    const h = await harness([{ picture: videoPicture("fade-in"), stored: BLACK }], {
      "fade-in-clip": BLACK,
    });

    await rebuildBlackPosters(h.ports);

    expect(h.decodedClips).toEqual(["fade-in-clip as fade-in.jpg"]);
    expect(await labelOf(await h.store.pictureBlob("fade-in"))).toBe("fade-in stored");
    expect((await h.store.getSlideshow("show-1")).pictures[0]).toEqual(videoPicture("fade-in"));
    expect(h.rebuilt).toEqual([]);
  });

  it("logs a clip that cannot be decoded and still rebuilds the others", async () => {
    const broken = new Error("no decoder for this track");
    const h = await harness(
      [
        { picture: videoPicture("broken"), stored: BLACK },
        { picture: videoPicture("fine"), stored: BLACK },
      ],
      { "broken-clip": broken },
    );

    await rebuildBlackPosters(h.ports);

    expect(h.logged).toEqual([broken]);
    expect(h.rebuilt).toEqual([["fine"]]);
    expect(await labelOf(await h.store.pictureBlob("broken"))).toBe("broken stored");
    expect(await labelOf(await h.store.pictureBlob("fine"))).toBe("fine-clip poster");
  });

  it("rebuilds a poster two slideshows share once and updates both records", async () => {
    const h = await harness([{ picture: videoPicture("shared"), stored: BLACK }]);
    await h.store.saveSlideshow(slideshow({ id: "show-2", pictures: [videoPicture("shared")] }));

    await rebuildBlackPosters(h.ports);

    expect(h.decodedClips).toEqual(["shared-clip as shared.jpg"]);
    expect(h.sampled).toEqual(["shared stored", "shared-clip poster"]);
    for (const id of ["show-1", "show-2"]) {
      expect((await h.store.getSlideshow(id)).pictures[0]?.colours).toEqual(REBUILT_COLOURS);
    }
    expect(h.rebuilt).toEqual([["shared"]]);
  });
});
