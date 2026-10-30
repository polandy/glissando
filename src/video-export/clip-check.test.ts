import { describe, expect, it } from "vitest";
import type { Slide, Slideshow } from "../player";
import { clipsToDecode, firstUndecodableClip } from "./clip-check";

function clipSlide(src: string, volume: number): Slide {
  return {
    image: { src: "p" },
    durationMs: 1000,
    video: { src, startMs: 0, endMs: 1000, volume },
  } as Slide;
}

describe("clipsToDecode", () => {
  it("lists the clips in show order, noting which have sound", () => {
    const slideshow = {
      formatVersion: 9,
      title: "t",
      slides: [{ image: { src: "p" }, durationMs: 1000 }, clipSlide("a", 1), clipSlide("b", 0)],
    } as Slideshow;

    expect(clipsToDecode(slideshow)).toEqual([
      { src: "a", withSound: true },
      { src: "b", withSound: false },
    ]);
  });
});

describe("firstUndecodableClip", () => {
  const clips = [
    { src: "a", withSound: true },
    { src: "b", withSound: false },
    { src: "c", withSound: true },
  ];

  it("names the first refused clip by its number, asking no further", async () => {
    const asked: string[] = [];

    const number = await firstUndecodableClip(clips, (clip) => {
      asked.push(clip.src);
      return Promise.resolve(clip.src !== "b");
    });

    expect(number).toBe(2);
    expect(asked).toEqual(["a", "b"]);
  });

  it("is null when every clip decodes", async () => {
    expect(await firstUndecodableClip(clips, () => Promise.resolve(true))).toBeNull();
  });
});
