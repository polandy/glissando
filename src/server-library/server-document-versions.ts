import {
  ENERGY_PACING_FROM_VERSION,
  LOOK_FROM_VERSION,
  MOOD_FROM_VERSION,
  PORTRAIT_PICTURES_FROM_VERSION,
  REPEAT_MUSIC_FROM_VERSION,
  SAMPLE_TRACK_FROM_VERSION,
} from "../glissando-file/glissando-manifest";
import { TITLE_CARDS_FROM_VERSION } from "../glissando-file/manifest-card";
import { migrateSlideshow } from "../glissando-file/manifest-migrations";
import { DocumentFormatError, isObject, type JsonObject } from "../glissando-file/document-values";
import { slideshowKeys } from "../glissando-file/slideshow-fields";
import { musicKeys, pictureKeys } from "../glissando-file/slideshow-fields-media";

/**
 * The newest manifest format version whose slideshow fields each server document version
 * carries, from version 1 on (`docs/dev/server_library/SERVER_DOCUMENT.md`, Versions).
 */
const MANIFEST_FIELDS_BY_VERSION = [
  PORTRAIT_PICTURES_FROM_VERSION,
  TITLE_CARDS_FROM_VERSION,
  SAMPLE_TRACK_FROM_VERSION,
  LOOK_FROM_VERSION,
  MOOD_FROM_VERSION,
  ENERGY_PACING_FROM_VERSION,
  REPEAT_MUSIC_FROM_VERSION,
] as const;

export const OLDEST_SERVER_DOCUMENT_FORMAT_VERSION = 1;
export const SERVER_DOCUMENT_FORMAT_VERSION = 7;

/** The first server document version with a playlist only, no single `music` (ADR-0023). */
const SONGS_ONLY_FROM_VERSION = 2;
/** Trip chapters (`docs/dev/player/TRIP_CHAPTERS.md`) are not part of a server document yet. */
const TRIP_CHAPTER_KEYS = ["automaticChaptersOff", "chapterEdits", "addedChapters"];

/** Whether `value` is a server document version this app reads. */
export function isReadableServerVersion(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= OLDEST_SERVER_DOCUMENT_FORMAT_VERSION &&
    value <= SERVER_DOCUMENT_FORMAT_VERSION
  );
}

function manifestFieldsVersion(version: number): number {
  const fields = MANIFEST_FIELDS_BY_VERSION[version - OLDEST_SERVER_DOCUMENT_FORMAT_VERSION];
  if (fields === undefined) {
    throw new RangeError(`no server document version ${version}`);
  }
  return fields;
}

/** Every key a server document of `version` may carry on its slideshow, a picture and a song. */
export function serverKeys(version: number): {
  readonly slideshow: readonly string[];
  readonly picture: readonly string[];
  readonly music: readonly string[];
} {
  const fields = manifestFieldsVersion(version);
  return {
    slideshow: slideshowKeys(fields).filter((key) => !TRIP_CHAPTER_KEYS.includes(key)),
    // A picture's resolved `place` is not part of a server document yet, like trip chapters.
    picture: [...pictureKeys(fields).filter((key) => key !== "place"), "immichAssetId"],
    music: [...musicKeys(fields), "musicId"],
  };
}

/** `slideshow`, read from a server document of `version`, in the current version's shape. */
export function migrateServerSlideshow(slideshow: unknown, version: number, path: string): unknown {
  if (!isObject(slideshow)) {
    return slideshow;
  }
  const withSongs =
    version < SONGS_ONLY_FROM_VERSION ? musicAsPlaylist(slideshow, path) : slideshow;
  return migrateSlideshow(withSongs, manifestFieldsVersion(version), path);
}

/** Version 1 carried a single `music` until the playlist came, without a version bump. */
function musicAsPlaylist(slideshow: JsonObject, path: string): JsonObject {
  const { music, ...rest } = slideshow;
  if (music === undefined) {
    return slideshow["songs"] === undefined ? { ...slideshow, songs: [] } : slideshow;
  }
  if (slideshow["songs"] !== undefined) {
    throw new DocumentFormatError(`${path}.songs`, "no songs beside a music", slideshow["songs"]);
  }
  return { ...rest, songs: [music] };
}
