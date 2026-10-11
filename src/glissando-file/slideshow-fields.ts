import { CAPTION_RULE, isCaption } from "../player/caption";
import { checkOwnKenBurns, InvalidOwnKenBurnsError, motionPath } from "../library/own-ken-burns";
import {
  checkOwnDurationMs,
  checkSlideshowTransition,
  checkTransitionChoice,
  InvalidOwnTimingError,
} from "../library/own-timing";
import {
  checkBetweenSongs,
  checkMusicFadeMs,
  checkMusicTrim,
  checkPictureChanges,
  InvalidOwnMusicError,
  type BetweenSongs,
} from "../library/own-music";
import {
  checkPictureLength,
  InvalidPictureLengthError,
  OWN_SECONDS_PICTURE_LENGTH,
  type PictureLength,
} from "../library/picture-length";
import { MAX_SECONDS_PER_PICTURE, MIN_SECONDS_PER_PICTURE } from "../library/stored-slideshow";
import {
  CAPTION_FROM_VERSION,
  DEFAULT_TRANSITION_FROM_VERSION,
  MUSIC_TRIM_FROM_VERSION,
  OWN_KEN_BURNS_FROM_VERSION,
  OWN_TIMING_FROM_VERSION,
  PICTURE_CHANGES_FROM_VERSION,
  PICTURE_LENGTH_FROM_VERSION,
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

/** A slideshow's own settings, without its pictures and its playlist. */
export type SlideshowFields = Omit<ManifestSlideshow, "pictures" | "songs">;
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
    "songs",
    "betweenSongs",
    ...(version >= DEFAULT_TRANSITION_FROM_VERSION ? ["transition"] : []),
    ...(version >= PICTURE_LENGTH_FROM_VERSION ? ["pictureLength"] : []),
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
    ...(show["pictureLength"] === undefined
      ? {}
      : { pictureLength: readPictureLength(show["pictureLength"], path) }),
    ...(show["ownOrder"] === true ? { ownOrder: true } : {}),
    ...(show["transition"] === undefined
      ? {}
      : { transition: readOwnTiming(checkSlideshowTransition, show["transition"], path) }),
    ...(show["betweenSongs"] === undefined
      ? {}
      : { betweenSongs: readBetweenSongs(show["betweenSongs"], path) }),
  };
}

function readBetweenSongs(value: unknown, path: string): BetweenSongs {
  return readOwnMusic(path, () => checkBetweenSongs(value, path));
}

/** The slideshow's playlist, each song read by `readSong`; may be empty. */
export function readSongs<Song>(
  show: JsonObject,
  path: string,
  readSong: (value: unknown, path: string) => Song,
): Song[] {
  const songs = show["songs"];
  if (!Array.isArray(songs)) {
    throw new DocumentFormatError(`${path}.songs`, "an array of songs", songs);
  }
  return songs.map((song: unknown, index) => readSong(song, `${path}.songs[${index}]`));
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
    ...(version >= PICTURE_CHANGES_FROM_VERSION ? ["pictureChanges"] : []),
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
  const { trim, fadeInMs, fadeOutMs, pictureChanges } = music;
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
      ...(pictureChanges === undefined
        ? {}
        : { pictureChanges: checkPictureChanges(pictureChanges, path) }),
    })),
  };
}

function readPictureLength(value: unknown, path: string): PictureLength {
  try {
    return checkPictureLength(value, path);
  } catch (error) {
    if (error instanceof InvalidPictureLengthError) {
      throw new DocumentFormatError(
        `${path}.pictureLength`,
        JSON.stringify(OWN_SECONDS_PICTURE_LENGTH),
        error.actual,
      );
    }
    throw error;
  }
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
