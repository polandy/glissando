import { CAPTION_RULE, isCaption } from "../player/caption";
import { checkOwnKenBurns, InvalidOwnKenBurnsError, motionPath } from "../library/own-ken-burns";
import {
  checkOwnDurationMs,
  checkSlideshowTransition,
  checkTransitionChoice,
  InvalidOwnTimingError,
} from "../library/own-timing";
import { checkMusicFadeMs, checkMusicTrim, InvalidOwnMusicError } from "../library/own-music";
import { MAX_SECONDS_PER_PICTURE, MIN_SECONDS_PER_PICTURE } from "../library/stored-slideshow";
import {
  CAPTION_FROM_VERSION,
  DEFAULT_TRANSITION_FROM_VERSION,
  MUSIC_TRIM_FROM_VERSION,
  OWN_KEN_BURNS_FROM_VERSION,
  OWN_TIMING_FROM_VERSION,
  type ManifestMusic,
  type ManifestPicture,
  type ManifestSlideshow,
} from "./glissando-manifest";
import {
  DocumentFormatError,
  readDateTime,
  readPositiveInteger,
  readText,
  type JsonObject,
} from "./document-values";

/**
 * The field checks every document holding a slideshow shares — the .glissando manifest and the
 * server slideshow (`dev-docs/SERVER_LIBRARY.md`). Each document adds the keys that name its
 * media; `version` is the manifest format version whose fields are read.
 */

/** A slideshow's own settings, without its pictures and music. */
export type SlideshowFields = Omit<ManifestSlideshow, "pictures" | "music">;
/** A picture's settings, without the keys that say where its bytes are. */
export type PictureFields = Omit<
  ManifestPicture,
  "file" | "thumbnail" | "immichAssetId" | "fileBytes"
>;
/** The music's settings, without the key that says where its bytes are. */
export type MusicFields = Omit<ManifestMusic, "file">;

export function slideshowKeys(version: number): string[] {
  return [
    "title",
    "createdAt",
    "secondsPerPicture",
    "ownOrder",
    "pictures",
    "music",
    ...(version >= DEFAULT_TRANSITION_FROM_VERSION ? ["transition"] : []),
  ];
}

export function readSlideshowFields(show: JsonObject, path: string): SlideshowFields {
  const secondsPerPicture = show["secondsPerPicture"];
  if (
    typeof secondsPerPicture !== "number" ||
    secondsPerPicture < MIN_SECONDS_PER_PICTURE ||
    secondsPerPicture > MAX_SECONDS_PER_PICTURE
  ) {
    throw new DocumentFormatError(
      `${path}.secondsPerPicture`,
      `a number from ${MIN_SECONDS_PER_PICTURE} to ${MAX_SECONDS_PER_PICTURE}`,
      secondsPerPicture,
    );
  }
  if (show["ownOrder"] !== undefined && show["ownOrder"] !== true) {
    throw new DocumentFormatError(`${path}.ownOrder`, "true or absent", show["ownOrder"]);
  }
  return {
    title: readText(show["title"], `${path}.title`),
    createdAt: readDateTime(show["createdAt"], `${path}.createdAt`),
    secondsPerPicture,
    ...(show["ownOrder"] === true ? { ownOrder: true } : {}),
    ...(show["transition"] === undefined
      ? {}
      : { transition: readOwnTiming(checkSlideshowTransition, show["transition"], path) }),
  };
}

/** The slideshow's pictures, at least one, each read by `readPicture`. */
export function readPictures<Picture>(
  show: JsonObject,
  path: string,
  readPicture: (value: unknown, path: string) => Picture,
): Picture[] {
  const pictures = show["pictures"];
  if (!Array.isArray(pictures) || pictures.length === 0) {
    throw new DocumentFormatError(`${path}.pictures`, "at least one picture", pictures);
  }
  return pictures.map((picture: unknown, index) =>
    readPicture(picture, `${path}.pictures[${index}]`),
  );
}

export function pictureKeys(version: number): string[] {
  return [
    "capturedAt",
    "width",
    "height",
    "fileName",
    ...(version >= OWN_KEN_BURNS_FROM_VERSION ? ["kenBurns"] : []),
    ...(version >= CAPTION_FROM_VERSION ? ["caption"] : []),
    ...(version >= OWN_TIMING_FROM_VERSION ? ["durationMs", "transition"] : []),
  ];
}

export function readPictureFields(picture: JsonObject, path: string): PictureFields {
  const { kenBurns, caption, durationMs, transition } = picture;
  return {
    capturedAt: readDateTime(picture["capturedAt"], `${path}.capturedAt`),
    width: readPositiveInteger(picture["width"], `${path}.width`),
    height: readPositiveInteger(picture["height"], `${path}.height`),
    fileName: readText(picture["fileName"], `${path}.fileName`),
    ...(kenBurns === undefined ? {} : { kenBurns: readOwnKenBurns(kenBurns, path) }),
    ...(caption === undefined ? {} : { caption: readCaption(caption, `${path}.caption`) }),
    ...(durationMs === undefined
      ? {}
      : { durationMs: readOwnTiming(checkOwnDurationMs, durationMs, path) }),
    ...(transition === undefined
      ? {}
      : { transition: readOwnTiming(checkTransitionChoice, transition, path) }),
  };
}

export function musicKeys(version: number): string[] {
  return [
    "fileName",
    "durationMs",
    "mimeType",
    ...(version >= MUSIC_TRIM_FROM_VERSION ? ["trim", "fadeInMs", "fadeOutMs"] : []),
  ];
}

export function readMusicFields(music: JsonObject, path: string): MusicFields {
  const durationMs = music["durationMs"];
  if (typeof durationMs !== "number" || !Number.isInteger(durationMs) || durationMs <= 0) {
    throw new DocumentFormatError(
      `${path}.durationMs`,
      "a positive whole number of milliseconds",
      durationMs,
    );
  }
  const { trim, fadeInMs, fadeOutMs } = music;
  return {
    fileName: readText(music["fileName"], `${path}.fileName`),
    durationMs,
    mimeType: readText(music["mimeType"], `${path}.mimeType`),
    ...readOwnMusic(path, () => ({
      ...(trim === undefined ? {} : { trim: checkMusicTrim(trim, durationMs, path) }),
      ...(fadeInMs === undefined ? {} : { fadeInMs: checkMusicFadeMs(fadeInMs, "fadeInMs", path) }),
      ...(fadeOutMs === undefined
        ? {}
        : { fadeOutMs: checkMusicFadeMs(fadeOutMs, "fadeOutMs", path) }),
    })),
  };
}

function readOwnTiming<Value>(
  check: (value: unknown, where: string) => Value,
  value: unknown,
  path: string,
): Value {
  try {
    return check(value, path);
  } catch (error) {
    if (error instanceof InvalidOwnTimingError) {
      throw new DocumentFormatError(`${path}.${error.field}`, error.expected, error.actual);
    }
    throw error;
  }
}

function readCaption(value: unknown, path: string): string {
  if (!isCaption(value)) {
    throw new DocumentFormatError(path, CAPTION_RULE, value);
  }
  return value;
}

function readOwnKenBurns(value: unknown, path: string) {
  try {
    return checkOwnKenBurns(value, path);
  } catch (error) {
    if (error instanceof InvalidOwnKenBurnsError) {
      throw new DocumentFormatError(
        motionPath(`${path}.kenBurns`, error.path),
        error.expected,
        error.actual,
      );
    }
    throw error;
  }
}

function readOwnMusic<Fields>(path: string, read: () => Fields): Fields {
  try {
    return read();
  } catch (error) {
    if (error instanceof InvalidOwnMusicError) {
      throw new DocumentFormatError(`${path}.${error.field}`, error.expected, error.actual);
    }
    throw error;
  }
}
