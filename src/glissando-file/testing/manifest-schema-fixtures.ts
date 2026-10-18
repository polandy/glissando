import Ajv from "ajv";
import type { GlissandoManifest } from "../glissando-manifest";
import type { PictureAsRead } from "../made-thumbnail-paths";
import { MANIFEST_SCHEMA } from "../manifest-schema";

/** A manifest document as read from JSON, before a missing thumbnail is made up (ADR-0038). */
type ManifestDocument = Omit<GlissandoManifest, "slideshow"> & {
  readonly slideshow: Omit<GlissandoManifest["slideshow"], "pictures"> & {
    readonly pictures: readonly PictureAsRead[];
  };
};

/**
 * A manifest at the current format version with every optional key present at a legal value —
 * the first picture carries a thumbnail, a video and its origin by `fileBytes`; the second omits
 * its thumbnail (the reader makes one up, ADR-0038) and carries its origin by `immichAssetId`
 * instead. Shared by `manifest-schema.test.ts` and its siblings.
 */
export const BASE_MANIFEST: ManifestDocument = {
  format: "glissando",
  formatVersion: 14,
  slideshow: {
    title: "Herbst in Wien",
    createdAt: "2025-10-01T08:00:00Z",
    secondsPerPicture: 5,
    ownOrder: true,
    transition: "alternate",
    betweenSongs: "sequence",
    pictureLength: "seconds",
    portraitPictures: "fill-screen",
    pictures: [
      {
        file: "pictures/0001.png",
        thumbnail: "thumbnails/0001.png",
        capturedAt: "2025-09-30T11:00:00Z",
        width: 40,
        height: 30,
        fileName: "b.jpg",
        colours: { veil: "#404040", accent: "#C0C0C0" },
        kenBurns: {
          from: { zoom: 1, centerX: 0.25, centerY: 0.5 },
          to: { zoom: 3, centerX: 0.6, centerY: 0.4 },
        },
        caption: "Am Steg",
        durationMs: 8000,
        transition: "dissolve",
        fileBytes: 2_500_000,
        alone: true,
        video: {
          file: "videos/clip-1.mp4",
          mimeType: "video/mp4",
          sourceMs: 20_000,
          startMs: 1000,
          endMs: 6000,
          volume: 60,
          duckMusic: false,
        },
      },
      {
        file: "pictures/0002.png",
        capturedAt: "2025-09-30T10:00:00Z",
        width: 40,
        height: 30,
        fileName: "a.jpg",
        colours: { veil: "#404040", accent: "#C0C0C0" },
        immichAssetId: "asset-a1",
      },
    ],
    songs: [
      {
        file: "music/track-1.m4a",
        fileName: "Walzer.m4a",
        mimeType: "audio/mp4",
        durationMs: 240_000,
        trim: { startMs: 12_000, endMs: 200_000 },
        fadeInMs: 500,
        fadeOutMs: 5000,
        pictureChanges: "even",
      },
    ],
    openingCard: {
      title: "Herbst in Wien",
      subtitle: "2025",
      style: "modern",
      position: "centre",
      entrance: "rise",
      background: { kind: "colour", colour: "plum" },
      motion: true,
    },
    closingCard: {
      title: "Danke",
      style: "classic",
      position: "bottom-left",
      entrance: "slow-fade",
      background: { kind: "picture", pictureIndex: 0, fade: 60, tint: "picture" },
      motion: false,
    },
  },
};

/** The schema compiled once with ajv 6, the way `manifest-schema.test.ts` and its siblings do. */
export const validateManifestSchema = new Ajv().compile(MANIFEST_SCHEMA);

function clone<Value>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}

/** `doc` with `path` (a dot/bracket-free, index-or-key segment list) set to `value`. */
export function withAt(doc: unknown, path: readonly (string | number)[], value: unknown): unknown {
  const result = clone(doc) as Record<string | number, unknown>;
  let target = result;
  for (const segment of path.slice(0, -1)) {
    target = target[segment] as Record<string | number, unknown>;
  }
  target[path[path.length - 1] as string | number] = value;
  return result;
}

/** `doc` with the key or index at `path` removed. */
export function withoutAt(doc: unknown, path: readonly (string | number)[]): unknown {
  const result = clone(doc) as Record<string | number, unknown>;
  let target = result;
  for (const segment of path.slice(0, -1)) {
    target = target[segment] as Record<string | number, unknown>;
  }
  const key = path[path.length - 1] as string | number;
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- the key is a test-case path, not user input
  delete target[key];
  return result;
}
