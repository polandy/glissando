import { describe, expect, it } from "vitest";
import type { PageCopy } from "../html-export/page-contract";
import { SLIDESHOW_FORMAT_VERSION, type Slideshow } from "../player";
import { PageDataError, readPageData, withSongUrls, type PageBlock } from "./page-data";

const COPY: PageCopy = {
  eyebrow: "Diashow",
  summary: "1 Bild · 0:04 · mit Musik",
  madeWith: "Erstellt mit Glissando",
  sampleMusicCredit: "",
  play: "Abspielen",
  pause: "Pause",
  mute: "Ton aus",
  unmute: "Ton an",
  fullScreen: "Vollbild",
  timeline: "Zeitleiste",
  playAgain: "Nochmal abspielen",
  cannotPlay: "Geht nicht.",
};

const SILENT_SLIDESHOW: Slideshow = {
  formatVersion: SLIDESHOW_FORMAT_VERSION,
  title: "Rom",
  slides: [
    {
      image: { src: "p0", capturedAt: "2026-07-01T10:00:00Z" },
      durationMs: 4000,
      kenBurns: {
        from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
        to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
        easing: "linear",
      },
    },
  ],
};

const SLIDESHOW: Slideshow = {
  ...SILENT_SLIDESHOW,
  music: [
    { src: "s0", atMs: 0, startMs: 0, endMs: 3000, fadeInMs: 0, fadeOutMs: 1000, gain: 1 },
    { src: "s1", atMs: 2000, startMs: 0, endMs: 1000, fadeInMs: 1000, fadeOutMs: 0, gain: 1 },
  ],
};

/** Two tracks of the one song `m0`. */
const TWO_TRACK_SLIDESHOW: Slideshow = {
  ...SILENT_SLIDESHOW,
  music: [
    { src: "m0", atMs: 0, startMs: 0, endMs: 3000, fadeInMs: 0, fadeOutMs: 1000, gain: 1 },
    { src: "m0", atMs: 2000, startMs: 0, endMs: 1000, fadeInMs: 1000, fadeOutMs: 0, gain: 1 },
  ],
};

function page(blocks: Partial<Record<string, PageBlock>>): (id: string) => PageBlock | null {
  return (id) => blocks[id] ?? null;
}

const BLOCKS: Record<string, PageBlock> = {
  slideshow: { text: JSON.stringify(SLIDESHOW), mimeType: null },
  copy: { text: JSON.stringify(COPY), mimeType: null },
  p0: { text: btoa("jpeg bytes"), mimeType: "image/jpeg" },
  s0: { text: btoa("wav bytes"), mimeType: "audio/wav" },
  s1: { text: btoa("ogg bytes"), mimeType: "audio/ogg" },
};

describe("readPageData", () => {
  it("reads the slideshow and the copy", () => {
    const data = readPageData(page(BLOCKS));

    expect(data.slideshow).toEqual(SLIDESHOW);
    expect(data.copy).toEqual(COPY);
  });

  it("opens a picture by its key as a Blob of its block's bytes and type", async () => {
    const picture = await readPageData(page(BLOCKS)).openPicture("p0");

    expect(picture.type).toBe("image/jpeg");
    expect(await picture.text()).toBe("jpeg bytes");
  });

  it("rejects a picture key without a block with PageDataError naming the key", async () => {
    await expect(readPageData(page(BLOCKS)).openPicture("p9")).rejects.toThrow(
      new PageDataError('the page holds no media block "p9"'),
    );
  });

  it("reads a clip by its key as a Blob of its block's bytes and type", async () => {
    const reads = readPageData(
      page({ ...BLOCKS, v0: { text: btoa("mp4 bytes"), mimeType: "video/mp4" } }),
    );

    const clip = await reads.readVideo("v0");

    expect(clip.type).toBe("video/mp4");
    expect(await clip.text()).toBe("mp4 bytes");
    expect(await reads.readVideo("v0")).toBe(clip);
  });

  it("rejects a clip key without a block with PageDataError naming the key", async () => {
    await expect(readPageData(page(BLOCKS)).readVideo("v3")).rejects.toThrow(
      new PageDataError('the page holds no media block "v3"'),
    );
  });

  it("holds every song the tracks play as one Blob each, by the tracks' src", async () => {
    const { songs } = readPageData(page(BLOCKS));

    expect([...songs.keys()]).toEqual(["s0", "s1"]);
    expect(songs.get("s0")?.type).toBe("audio/wav");
    expect(await songs.get("s1")?.text()).toBe("ogg bytes");
  });

  it("fails loud on a track whose song has no block", () => {
    expect(() => readPageData(page({ ...BLOCKS, s1: undefined }))).toThrow(
      new PageDataError('the page holds no media block "s1"'),
    );
  });

  it("has no music when the slideshow has none", () => {
    const data = readPageData(
      page({ ...BLOCKS, slideshow: { text: JSON.stringify(SILENT_SLIDESHOW), mimeType: null } }),
    );

    expect(data.slideshow.slides).toHaveLength(1);
    expect(data.songs.size).toBe(0);
  });

  it("fails loud on a page without its slideshow block", () => {
    expect(() => readPageData(page({ ...BLOCKS, slideshow: undefined }))).toThrow(PageDataError);
  });

  it("rejects copy with a missing or unknown key, naming it", () => {
    // JSON leaves an undefined value out.
    const withoutPlay = { ...COPY, play: undefined };
    const broken = (copy: object) =>
      readPageData(page({ ...BLOCKS, copy: { text: JSON.stringify(copy), mimeType: null } }));

    expect(() => broken(withoutPlay)).toThrow(/"play"/);
    expect(() => broken({ ...COPY, extra: "x" })).toThrow(/"extra"/);
  });
});

describe("withSongUrls", () => {
  it("gives every track its song's URL, one per song", () => {
    const songs = new Map([["m0", new Blob(["song"])]]);
    const created: string[] = [];

    const playing = withSongUrls(TWO_TRACK_SLIDESHOW, songs, () => {
      created.push("blob:m0");
      return "blob:m0";
    });

    expect(playing.music?.map(({ src }) => src)).toEqual(["blob:m0", "blob:m0"]);
    expect(created).toEqual(["blob:m0"]);
  });

  it("throws PageDataError naming a track whose song the page does not hold", () => {
    expect(() => withSongUrls(TWO_TRACK_SLIDESHOW, new Map(), () => "blob:x")).toThrow(
      new PageDataError('the page holds no song "m0" for a track'),
    );
  });
});
