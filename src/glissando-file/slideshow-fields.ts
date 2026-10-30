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
import { checkSlideshowLook, InvalidSlideshowLookError } from "../library/slideshow-look";
import {
  checkSlideshowMood,
  InvalidSlideshowMoodError,
  SLIDESHOW_MOODS,
  type SlideshowMood,
} from "../library/slideshow-mood";
import { MAX_SECONDS_PER_PICTURE, MIN_SECONDS_PER_PICTURE } from "../library/stored-slideshow";
import { GRADED_SLIDESHOW_LOOKS, type GradedSlideshowLook } from "../player/looks/slideshow-look";
import {
  DEFAULT_TRANSITION_FROM_VERSION,
  ENERGY_PACING_FROM_VERSION,
  LOOK_FROM_VERSION,
  MOOD_FROM_VERSION,
  PICTURE_LENGTH_FROM_VERSION,
  REPEAT_MUSIC_FROM_VERSION,
  TRIP_CHAPTERS_FROM_VERSION,
  type ManifestMusic,
  type ManifestPicture,
  type ManifestSlideshow,
} from "./glissando-manifest";
import { readManifestAddedChapters, readManifestChapterEdits } from "./manifest-chapters";
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
  "file" | "thumbnail" | "immichAssetId" | "fileBytes" | "video"
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
    ...(version >= REPEAT_MUSIC_FROM_VERSION ? ["repeatMusic"] : []),
    ...(version >= DEFAULT_TRANSITION_FROM_VERSION ? ["transition"] : []),
    ...(version >= PICTURE_LENGTH_FROM_VERSION ? ["pictureLength"] : []),
    "portraitPictures",
    ...(version >= TITLE_CARDS_FROM_VERSION ? ["openingCard", "closingCard"] : []),
    ...(version >= TRIP_CHAPTERS_FROM_VERSION
      ? ["automaticChaptersOff", "chapterEdits", "addedChapters"]
      : []),
    ...(version >= LOOK_FROM_VERSION ? ["look"] : []),
    ...(version >= MOOD_FROM_VERSION ? ["mood"] : []),
    ...(version >= ENERGY_PACING_FROM_VERSION ? ["energyPacing"] : []),
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
  if (show["automaticChaptersOff"] !== undefined && show["automaticChaptersOff"] !== true) {
    throw new DocumentFormatError(
      `${path}.automaticChaptersOff`,
      "true or absent",
      show["automaticChaptersOff"],
    );
  }
  if (show["energyPacing"] !== undefined && show["energyPacing"] !== true) {
    throw new DocumentFormatError(`${path}.energyPacing`, "true or absent", show["energyPacing"]);
  }
  if (show["repeatMusic"] !== undefined && show["repeatMusic"] !== true) {
    throw new DocumentFormatError(`${path}.repeatMusic`, "true or absent", show["repeatMusic"]);
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
    ...(show["repeatMusic"] === true ? { repeatMusic: true } : {}),
    ...(show["portraitPictures"] === undefined
      ? {}
      : { portraitPictures: readPortraitPictures(show["portraitPictures"], path) }),
    ...(show["look"] === undefined ? {} : { look: readLook(show["look"], path) }),
    ...(show["mood"] === undefined ? {} : { mood: readMood(show["mood"], path) }),
    ...(show["energyPacing"] === true ? { energyPacing: true } : {}),
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
    ...(show["automaticChaptersOff"] === true ? { automaticChaptersOff: true } : {}),
    ...(show["chapterEdits"] === undefined
      ? {}
      : {
          chapterEdits: readManifestChapterEdits(
            show["chapterEdits"],
            `${path}.chapterEdits`,
            pictureCount,
          ),
        }),
    ...(show["addedChapters"] === undefined
      ? {}
      : {
          addedChapters: readManifestAddedChapters(
            show["addedChapters"],
            `${path}.addedChapters`,
            pictureCount,
          ),
        }),
  };
}

function readLook(value: unknown, path: string): GradedSlideshowLook {
  try {
    return checkSlideshowLook(value, path);
  } catch (error) {
    if (error instanceof InvalidSlideshowLookError) {
      throw new DocumentFormatError(
        `${path}.look`,
        `one of ${GRADED_SLIDESHOW_LOOKS.join(", ")}`,
        error.actual,
      );
    }
    throw error;
  }
}

function readMood(value: unknown, path: string): SlideshowMood {
  try {
    return checkSlideshowMood(value, path);
  } catch (error) {
    if (error instanceof InvalidSlideshowMoodError) {
      throw new DocumentFormatError(
        `${path}.mood`,
        `one of ${SLIDESHOW_MOODS.join(", ")}`,
        error.actual,
      );
    }
    throw error;
  }
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
