import { expect } from "vitest";
import type { MusicLoudness } from "../src/loudness/measure-loudness";
import { musicLoudnessToJson } from "../src/loudness/music-loudness-json";
import type { StoredFocus } from "../src/library/picture-focus";
import {
  SERVER_DOCUMENT_FORMAT_VERSION,
  type ServerDocument,
} from "../src/server-library/server-document";
import type { MusicRecord, SlideshowRecord } from "./library-repository";

export const TOKEN_A = "AAAAAAAAAAAAAAAAAAAAAA";
export const TOKEN_B = "BBBBBBBBBBBBBBBBBBBBBB";
// The asset id every `documentTitled` picture names, so a slideshow always references it.
export const PICTURE_ASSET_ID = "0b5a7c3e-1f2d-4e6a-9b8c-7d6e5f4a3b2c";

export function documentTitled(title: string): ServerDocument {
  return {
    format: "glissando-server",
    formatVersion: SERVER_DOCUMENT_FORMAT_VERSION,
    slideshow: {
      title,
      createdAt: "2025-10-01T08:00:00.000Z",
      secondsPerPicture: 5,
      pictures: [
        {
          capturedAt: "2025-09-30T10:00:00Z",
          width: 1920,
          height: 1080,
          fileName: "a.jpg",
          immichAssetId: "0b5a7c3e-1f2d-4e6a-9b8c-7d6e5f4a3b2c",
          colours: { veil: "#404040", accent: "#C0C0C0" },
        },
      ],
      songs: [],
    },
  };
}

export function withMusic(musicId: string): ServerDocument {
  const document = documentTitled("With music");
  const trackMusic = { musicId, fileName: "track.m4a", durationMs: 60000, mimeType: "audio/mp4" };
  return { ...document, slideshow: { ...document.slideshow, songs: [trackMusic] } };
}

export function slideshow(id: string, createdAt: number): SlideshowRecord {
  return { id, revision: 1, createdAt, document: documentTitled(`Slideshow ${id}`) };
}

export function music(id: string, uploadedAt: number): MusicRecord {
  return { id, contentType: "audio/mp4", bytes: new Uint8Array([1, 2, 3]), uploadedAt };
}

export function storedFocus(detector: number): StoredFocus {
  return { focus: { kind: "none" }, detector };
}

export function loudnessOf(blockMeanSquares: number[], hopPeaks: number[]): MusicLoudness {
  return {
    blockMeanSquares: Float32Array.from(blockMeanSquares),
    hopPeaks: Float32Array.from(hopPeaks),
  };
}

/**
 * Compares through the compact dB/dBFS wire form (ADR-0021 style), since the sqlite adapter
 * rounds to 0.01 dB on the way in; the exact linear values an adapter kept are not the point.
 */
export function expectSameLoudness(
  actual: MusicLoudness | undefined,
  expected: MusicLoudness,
): void {
  expect(actual).toBeDefined();
  expect(musicLoudnessToJson(actual as MusicLoudness)).toEqual(musicLoudnessToJson(expected));
}
