import { describe, expect, it } from "vitest";
import type { PageCopy } from "../html-export/page-contract";
import { SLIDESHOW_FORMAT_VERSION, type Slideshow } from "../player";
import { PageDataError, readPageData, type PageBlock } from "./page-data";

const COPY: PageCopy = {
  eyebrow: "Diashow",
  summary: "1 Bild · 0:04 · mit Musik",
  madeWith: "Erstellt mit Glissando",
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
  music: { src: "music", startMs: 0, endMs: 4000, fadeInMs: 0, fadeOutMs: 0 },
};

function page(blocks: Partial<Record<string, PageBlock>>): (id: string) => PageBlock | null {
  return (id) => blocks[id] ?? null;
}

const BLOCKS: Record<string, PageBlock> = {
  slideshow: { text: JSON.stringify(SLIDESHOW), mimeType: null },
  copy: { text: JSON.stringify(COPY), mimeType: null },
  p0: { text: btoa("jpeg bytes"), mimeType: "image/jpeg" },
  music: { text: btoa("wav bytes"), mimeType: "audio/wav" },
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

  it("holds the music as one Blob when the slideshow has music", async () => {
    const music = readPageData(page(BLOCKS)).music;

    expect(music?.type).toBe("audio/wav");
    expect(await music?.text()).toBe("wav bytes");
  });

  it("has no music when the slideshow has none", () => {
    const data = readPageData(
      page({ ...BLOCKS, slideshow: { text: JSON.stringify(SILENT_SLIDESHOW), mimeType: null } }),
    );

    expect(data.slideshow.slides).toHaveLength(1);
    expect(data.music).toBeNull();
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
