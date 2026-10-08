import { describe, expect, it } from "vitest";
import type { PictureImportState } from "../../import/picture-import";
import type { StoredPicture } from "../../library/stored-slideshow";
import {
  canContinue,
  captureRange,
  hasSelection,
  importTiming,
  musicFormatLabel,
  picturesPhase,
} from "./import-view";

const picture = (id: string, capturedAt: string): StoredPicture => ({
  id,
  capturedAt,
  width: 300,
  height: 200,
  fileName: `${id}.jpg`,
});

const idle: PictureImportState = {
  total: 0,
  done: 0,
  pictures: [],
  skipped: [],
  storageFull: false,
  busy: false,
  failed: false,
};
const oneStored = { ...idle, total: 1, done: 1, pictures: [picture("a", "2025-07-01T10:00:00Z")] };

describe("picturesPhase", () => {
  it.each([
    ["nothing chosen yet is empty", idle, "empty"],
    ["files in flight are importing", { ...idle, total: 2, busy: true }, "importing"],
    ["every file processed with a picture is done", oneStored, "done"],
    ["only unreadable files leave it empty", { ...idle, total: 1, done: 1 }, "empty"],
  ] as const)("%s", (_, state, phase) => {
    expect(picturesPhase(state)).toBe(phase);
  });
});

describe("canContinue", () => {
  it.each([
    ["with a stored picture and nothing in flight", oneStored, true],
    ["not without any picture", idle, false],
    ["not while pictures are being downscaled", { ...oneStored, total: 2, busy: true }, false],
    ["not after the import failed", { ...oneStored, failed: true }, false],
  ] as const)("continues %s: %s", (_, state, expected) => {
    expect(canContinue(state)).toBe(expected);
  });
});

describe("hasSelection", () => {
  it.each([
    ["a stored picture", oneStored, true],
    ["files in flight", { ...idle, total: 1, busy: true }, true],
    ["nothing", idle, false],
  ] as const)("%s counts as a selection: %s", (_, state, expected) => {
    expect(hasSelection(state)).toBe(expected);
  });
});

describe("captureRange", () => {
  it("spans the first to the last capture date of pictures in capture order", () => {
    const pictures = [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-08-03T09:00:00Z")];
    expect(captureRange(pictures)).toEqual({
      from: "2025-07-01T10:00:00Z",
      to: "2025-08-03T09:00:00Z",
    });
  });

  it("has no range without pictures", () => {
    expect(captureRange([])).toBeNull();
  });
});

describe("importTiming", () => {
  it("without music every picture stays the chosen seconds", () => {
    expect(importTiming(12, undefined, 4.5)).toEqual({ perPictureSeconds: 4.5, totalSeconds: 54 });
  });

  it("with music the pictures share the track's length", () => {
    expect(importTiming(4, 60_000, 5)).toEqual({ perPictureSeconds: 15, totalSeconds: 60 });
  });

  it("with music too short for the pictures every picture gets the minimum", () => {
    expect(importTiming(10, 5_000, 5)).toEqual({ perPictureSeconds: 2, totalSeconds: 20 });
  });
});

describe("musicFormatLabel", () => {
  it.each([
    ["the file extension, upper-cased", "Sommer.mp3", "audio/mpeg", "MP3"],
    ["the type's subtype without an extension", "Sommer", "audio/ogg", "OGG"],
    ["the type's subtype when the name ends in a dot", "Sommer.", "audio/wav", "WAV"],
    ["nothing when neither is known", "Sommer", "", ""],
  ])("names the format by %s", (_, fileName, mimeType, label) => {
    expect(musicFormatLabel(fileName, mimeType)).toBe(label);
  });
});
