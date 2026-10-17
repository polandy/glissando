import { describe, expect, it } from "vitest";
import { isAllowedEntryName, matchesMediaKind } from "./entry-names";

describe("isAllowedEntryName", () => {
  it.each([
    "glissando.json",
    "glissando.schema.json",
    "README.txt",
    "index.html",
    "pictures/0001.jpg",
    "pictures/00012.png",
    "thumbnails/0001.webp",
    "music/track-1",
    "music/track-1.mp3",
    "music/track-12.m4a",
    "videos/clip-1",
    "videos/clip-1.mov",
    "videos/clip-10.webm",
  ])('accepts "%s"', (name) => {
    expect(isAllowedEntryName(name)).toBe(true);
  });

  it.each([
    "../glissando.json",
    "/glissando.json",
    "pictures/../glissando.json",
    "pictures\\0001.jpg",
    "__MACOSX/pictures/0001.jpg",
    "pictures/",
    "pictures/001.jpg",
    "pictures/0001.gif",
    "thumbnails/0001.jpg.exe",
    "music/track-0.mp3",
    "music/track-01.mp3",
    "videos/clip-0.mov",
    "videos/clip-01.mov",
    "IMG_0001.jpg",
    "glissando.JSON",
  ])('refuses "%s"', (name) => {
    expect(isAllowedEntryName(name)).toBe(false);
  });
});

describe("matchesMediaKind", () => {
  it("accepts a picture's file only as a pictures/ name", () => {
    expect(matchesMediaKind("picture", "pictures/0001.jpg")).toBe(true);
    expect(matchesMediaKind("picture", "thumbnails/0001.jpg")).toBe(false);
  });

  it("accepts a thumbnail's file only as a thumbnails/ name", () => {
    expect(matchesMediaKind("thumbnail", "thumbnails/0001.jpg")).toBe(true);
    expect(matchesMediaKind("thumbnail", "pictures/0001.jpg")).toBe(false);
  });

  it("accepts a song's file only as a music/ name", () => {
    expect(matchesMediaKind("music", "music/track-1.mp3")).toBe(true);
    expect(matchesMediaKind("music", "videos/clip-1.mp3")).toBe(false);
  });

  it("accepts a clip's file only as a videos/ name", () => {
    expect(matchesMediaKind("video", "videos/clip-1.mov")).toBe(true);
    expect(matchesMediaKind("video", "music/track-1.mov")).toBe(false);
  });
});
