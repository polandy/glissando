import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { DocumentFormatError } from "../glissando-file/document-values";
import { readServerDocument, serverDocumentFor, type ServerDocument } from "./server-document";

export const ASSET_A = "0b5a7c3e-1f2d-4e6a-9b8c-7d6e5f4a3b2c";
export const ASSET_B = "1c6b8d4f-2a3e-4f7b-8c9d-8e7f6a5b4c3d";
export const MUSIC_ID = "2d7c9e5a-3b4f-4a8c-9dae-9f8a7b6c5d4e";
export const MUSIC_ID_2 = "3e8daf6b-4c5a-4b9d-aebf-af9b8c7d6e5f";

export const slideshow: StoredSlideshow = {
  id: "server-show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: ASSET_A,
      capturedAt: "2025-09-30T10:00:00Z",
      width: 3840,
      height: 2160,
      fileName: "a.jpg",
      caption: "Am Steg",
      immichAssetId: ASSET_A,
    },
    {
      id: ASSET_B,
      capturedAt: "2025-09-30T11:00:00Z",
      width: 2160,
      height: 3840,
      fileName: "b.jpg",
      durationMs: 8000,
      transition: "cut",
      kenBurns: {
        from: { zoom: 2.5, centerX: 0.3, centerY: 0.2 },
        to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      },
      immichAssetId: ASSET_B,
    },
  ],
  ownOrder: true,
  transition: "alternate",
  songs: [
    {
      id: MUSIC_ID,
      fileName: "Walzer.m4a",
      durationMs: 240000,
      mimeType: "audio/mp4",
      fadeInMs: 2000,
    },
  ],
  secondsPerPicture: 5,
};

export const [firstStoredPicture] = slideshow.pictures as [StoredPicture, ...StoredPicture[]];

/** A copy of `value` without `key`. */
export function without(value: object, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
}

export const document = (): ServerDocument => serverDocumentFor(slideshow);

/** The written document as JSON, with `change` applied to its slideshow. */
export function withSlideshow(change: Record<string, unknown>): unknown {
  const written = document();
  return JSON.parse(JSON.stringify({ ...written, slideshow: { ...written.slideshow, ...change } }));
}

export function withFirstPicture(change: Record<string, unknown>): unknown {
  const [first, ...rest] = document().slideshow.pictures;
  return withSlideshow({ pictures: [{ ...first, ...change }, ...rest] });
}

export const readFails = (json: unknown): string => {
  try {
    readServerDocument(json);
  } catch (error) {
    if (error instanceof DocumentFormatError) {
      return error.message;
    }
    throw error;
  }
  throw new Error("the document was read as valid");
};
