import {
  MANIFEST_ENTRY_NAME,
  PICTURE_FILE_EXTENSIONS,
  PICTURE_NUMBER_DIGITS,
} from "./glissando-manifest";

/**
 * Which entry names a .glissando file may hold (ADR-0038): a fixed set of non-media names, plus
 * one pattern per kind of media. Anything else — a path outside the container, a directory entry,
 * a macOS resource fork — refuses the file before any of its bytes are read.
 */

export const SCHEMA_ENTRY_NAME = "glissando.schema.json";
export const README_ENTRY_NAME = "README.txt";
export const PLAYER_ENTRY_NAME = "index.html";

const NON_MEDIA_ENTRY_NAMES: ReadonlySet<string> = new Set([
  MANIFEST_ENTRY_NAME,
  SCHEMA_ENTRY_NAME,
  README_ENTRY_NAME,
  PLAYER_ENTRY_NAME,
]);

export type MediaKind = "picture" | "thumbnail" | "music" | "video";

/** A positive index with no leading zero, as `music/track-<n>` and `videos/clip-<n>` number. */
const COUNTING_NUMBER = "[1-9][0-9]*";
/** An optional file extension, kept from the original file so an unzipped copy still opens. */
const OPTIONAL_EXTENSION = "(?:\\.[a-z0-9]{1,8})?";
const PICTURE_EXTENSION_GROUP = PICTURE_FILE_EXTENSIONS.join("|");

const MEDIA_NAME_PATTERNS: Readonly<Record<MediaKind, RegExp>> = {
  picture: new RegExp(`^pictures/\\d{${PICTURE_NUMBER_DIGITS},}\\.(?:${PICTURE_EXTENSION_GROUP})$`),
  thumbnail: new RegExp(
    `^thumbnails/\\d{${PICTURE_NUMBER_DIGITS},}\\.(?:${PICTURE_EXTENSION_GROUP})$`,
  ),
  music: new RegExp(`^music/track-${COUNTING_NUMBER}${OPTIONAL_EXTENSION}$`),
  video: new RegExp(`^videos/clip-${COUNTING_NUMBER}${OPTIONAL_EXTENSION}$`),
};

/** Whether `name` is one this format ever writes: a fixed name or a media path of some kind. */
export function isAllowedEntryName(name: string): boolean {
  if (NON_MEDIA_ENTRY_NAMES.has(name)) {
    return true;
  }
  return Object.values(MEDIA_NAME_PATTERNS).some((pattern) => pattern.test(name));
}

/** Whether `path` is a valid entry name for media of `kind`, as the manifest may name it. */
export function matchesMediaKind(kind: MediaKind, path: string): boolean {
  return MEDIA_NAME_PATTERNS[kind].test(path);
}
