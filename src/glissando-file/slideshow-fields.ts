import { checkSlideshowTransition, InvalidOwnTimingError } from "../library/own-timing";
import { checkBetweenSongs, type BetweenSongs } from "../library/own-music";
import {
  checkPictureLength,
  InvalidPictureLengthError,
  OWN_SECONDS_PICTURE_LENGTH,
  type PictureLength,
} from "../library/picture-length";
import {
  checkPortraitPictures,
  InvalidPortraitPicturesError,
  PORTRAIT_PICTURES_CHOICES,
  type PortraitPictures,
} from "../library/portrait-pictures";
import { MAX_SECONDS_PER_PICTURE, MIN_SECONDS_PER_PICTURE } from "../library/stored-slideshow";
import {
  DEFAULT_TRANSITION_FROM_VERSION,
  PICTURE_LENGTH_FROM_VERSION,
  type ManifestMusic,
  type ManifestPicture,
  type ManifestSlideshow,
} from "./glissando-manifest";
import { readManifestCard, TITLE_CARDS_FROM_VERSION } from "./manifest-card";
import { readOwnMusic } from "./slideshow-fields-media";
import { DocumentFormatError, readDateTime, readText, type JsonObject } from "./document-values";

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
    "portraitPictures",
    ...(version >= TITLE_CARDS_FROM_VERSION ? ["openingCard", "closingCard"] : []),
  ];
}

/** `pictureCount` bounds-checks a card's `background.pictureIndex`, read after the pictures. */
export function readSlideshowFields(
  show: JsonObject,
  path: string,
  pictureCount: number,
): SlideshowFields {
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
    ...(show["portraitPictures"] === undefined
      ? {}
      : { portraitPictures: readPortraitPictures(show["portraitPictures"], path) }),
    ...(show["openingCard"] === undefined
      ? {}
      : {
          openingCard: readManifestCard(show["openingCard"], `${path}.openingCard`, pictureCount),
        }),
    ...(show["closingCard"] === undefined
      ? {}
      : {
          closingCard: readManifestCard(show["closingCard"], `${path}.closingCard`, pictureCount),
        }),
  };
}

function readPortraitPictures(value: unknown, path: string): PortraitPictures {
  try {
    return checkPortraitPictures(value, path);
  } catch (error) {
    if (error instanceof InvalidPortraitPicturesError) {
      throw new DocumentFormatError(
        `${path}.portraitPictures`,
        `one of ${PORTRAIT_PICTURES_CHOICES.join(", ")}`,
        error.actual,
      );
    }
    throw error;
  }
}

function readBetweenSongs(value: unknown, path: string): BetweenSongs {
  return readOwnMusic(path, () => checkBetweenSongs(value, path));
}

/** The slideshow's playlist, each song read by `readSong`; may be empty. */
export function readSongs<Song>(
  show: JsonObject,
  path: string,
  readSong: (value: unknown, path: string, index: number) => Song,
): Song[] {
  const songs = show["songs"];
  if (!Array.isArray(songs)) {
    throw new DocumentFormatError(`${path}.songs`, "an array of songs", songs);
  }
  return songs.map((song: unknown, index) => readSong(song, `${path}.songs[${index}]`, index));
}

/** The slideshow's pictures, at least one, each read by `readPicture`. */
export function readPictures<Picture>(
  show: JsonObject,
  path: string,
  readPicture: (value: unknown, path: string, index: number) => Picture,
): Picture[] {
  const pictures = show["pictures"];
  if (!Array.isArray(pictures) || pictures.length === 0) {
    throw new DocumentFormatError(`${path}.pictures`, "at least one picture", pictures);
  }
  return pictures.map((picture: unknown, index) =>
    readPicture(picture, `${path}.pictures[${index}]`, index),
  );
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

/** Rewraps `check`'s `InvalidOwnTimingError` as a `DocumentFormatError`; shared with the media fields. */
export function readOwnTiming<Value>(
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
