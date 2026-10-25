import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { ENERGY_PACING_FROM_VERSION, ownMusicFields } from "../glissando-file/glissando-manifest";
import { cardFromManifest, cardToManifest } from "../glissando-file/manifest-card";
import { DocumentFormatError, readObject, readText } from "../glissando-file/document-values";
import {
  readPictures,
  readSlideshowFields,
  readSongs,
  slideshowKeys,
  type MusicFields,
  type PictureFields,
  type SlideshowFields,
} from "../glissando-file/slideshow-fields";
import {
  musicKeys,
  pictureKeys,
  readMusicFields,
  readPictureFields,
} from "../glissando-file/slideshow-fields-media";

/**
 * A slideshow on the Glissando server: the .glissando manifest's slideshow with every picture
 * linked from Immich and the playlist's songs each named by the server's id
 * (`dev-docs/server_library/SERVER_DOCUMENT.md`). Shared by the app and the server.
 */

export const SERVER_DOCUMENT_FORMAT_ID = "glissando-server";
/**
 * Version 2 added the slideshow's `openingCard` and `closingCard` (ADR-0032), version 3 a
 * picture's `colours` and a card's picture background `tint` (ADR-0033), version 4 the
 * slideshow's `look` (ADR-0044), version 5 the slideshow's `mood` (ADR-0045), version 6 the
 * slideshow's `energyPacing` (ADR-0046). Only version 6 is read: there is no production instance
 * yet, so an older document is refused rather than migrated.
 */
export const SERVER_DOCUMENT_FORMAT_VERSION = 6;
/** The manifest format version whose slideshow fields a server document carries. */
const MANIFEST_FIELDS_VERSION = ENERGY_PACING_FROM_VERSION;
/** Trip chapters (`dev-docs/player/TRIP_CHAPTERS.md`) are not part of a server document yet. */
const TRIP_CHAPTER_KEYS = ["automaticChaptersOff", "chapterEdits", "addedChapters"];
/** Every key a server document's slideshow, each picture and each song may carry. */
export const SERVER_SLIDESHOW_KEYS: readonly string[] = slideshowKeys(
  MANIFEST_FIELDS_VERSION,
).filter((key) => !TRIP_CHAPTER_KEYS.includes(key));
export const SERVER_PICTURE_KEYS: readonly string[] = [
  // A picture's resolved `place` is not part of a server document yet, like trip chapters.
  ...pictureKeys(MANIFEST_FIELDS_VERSION).filter((key) => key !== "place"),
  "immichAssetId",
];
export const SERVER_MUSIC_KEYS: readonly string[] = [
  ...musicKeys(MANIFEST_FIELDS_VERSION),
  "musicId",
];

/** A server document's picture fields: no resolved `place` yet (`MANIFEST_FIELDS_VERSION`). */
export interface ServerPicture extends Omit<PictureFields, "place"> {
  readonly immichAssetId: string;
}

export interface ServerMusic extends MusicFields {
  /** The server's id of the uploaded file. */
  readonly musicId: string;
}

/** A server document's slideshow fields: no trip chapters yet (`MANIFEST_FIELDS_VERSION`). */
export interface ServerSlideshow extends Omit<
  SlideshowFields,
  "automaticChaptersOff" | "chapterEdits" | "addedChapters"
> {
  readonly pictures: readonly ServerPicture[];
  /** The playlist, in play order; empty for no music (ADR-0023). */
  readonly songs: readonly ServerMusic[];
}

export interface ServerDocument {
  readonly format: typeof SERVER_DOCUMENT_FORMAT_ID;
  readonly formatVersion: typeof SERVER_DOCUMENT_FORMAT_VERSION;
  readonly slideshow: ServerSlideshow;
}

/** Untrusted JSON as a server document; throws `DocumentFormatError` naming path and value. */
export function readServerDocument(json: unknown): ServerDocument {
  const root = readObject(json, "", ["format", "formatVersion", "slideshow"]);
  if (root["format"] !== SERVER_DOCUMENT_FORMAT_ID) {
    throw new DocumentFormatError("format", `"${SERVER_DOCUMENT_FORMAT_ID}"`, root["format"]);
  }
  if (root["formatVersion"] !== SERVER_DOCUMENT_FORMAT_VERSION) {
    throw new DocumentFormatError(
      "formatVersion",
      String(SERVER_DOCUMENT_FORMAT_VERSION),
      root["formatVersion"],
    );
  }
  const path = "slideshow";
  // A single `music` is refused as an unknown key, like any other field this version does not
  // carry (ADR-0023).
  const show = readObject(root["slideshow"], path, SERVER_SLIDESHOW_KEYS);
  const pictures = readPictures(show, path, readPicture);
  refuseRepeatedAssets(pictures, path);
  const songs = readSongs(show, path, readMusic);
  refuseRepeatedMusicIds(songs, path);
  return {
    format: SERVER_DOCUMENT_FORMAT_ID,
    formatVersion: SERVER_DOCUMENT_FORMAT_VERSION,
    slideshow: {
      ...readSlideshowFields(show, path, pictures.length),
      pictures,
      songs,
    },
  };
}

function refuseRepeatedMusicIds(songs: readonly ServerMusic[], path: string): void {
  const seen = new Set<string>();
  for (const [index, { musicId }] of songs.entries()) {
    if (seen.has(musicId)) {
      throw new DocumentFormatError(
        `${path}.songs[${index}].musicId`,
        "a music no other song has",
        musicId,
      );
    }
    seen.add(musicId);
  }
}

function readPicture(value: unknown, path: string): ServerPicture {
  const picture = readObject(value, path, SERVER_PICTURE_KEYS);
  return {
    ...readPictureFields(picture, path),
    immichAssetId: readText(picture["immichAssetId"], `${path}.immichAssetId`),
  };
}

function refuseRepeatedAssets(pictures: readonly ServerPicture[], path: string): void {
  const seen = new Set<string>();
  for (const [index, { immichAssetId }] of pictures.entries()) {
    if (seen.has(immichAssetId)) {
      throw new DocumentFormatError(
        `${path}.pictures[${index}].immichAssetId`,
        "an asset no other picture has",
        immichAssetId,
      );
    }
    seen.add(immichAssetId);
  }
}

function readMusic(value: unknown, path: string): ServerMusic {
  const music = readObject(value, path, SERVER_MUSIC_KEYS);
  return {
    ...readMusicFields(music, path),
    musicId: readText(music["musicId"], `${path}.musicId`),
  };
}

/**
 * The server document of `slideshow`, whose pictures are all linked from Immich and whose
 * playlist's songs are each named by the server's `musicId`.
 */
export function serverDocumentFor(slideshow: StoredSlideshow): ServerDocument {
  const pictureIds = slideshow.pictures.map((picture) => picture.id);
  const openingCard = cardToManifest(slideshow.openingCard, pictureIds);
  const closingCard = cardToManifest(slideshow.closingCard, pictureIds);
  return {
    format: SERVER_DOCUMENT_FORMAT_ID,
    formatVersion: SERVER_DOCUMENT_FORMAT_VERSION,
    slideshow: {
      title: slideshow.title,
      createdAt: slideshow.createdAt,
      secondsPerPicture: slideshow.secondsPerPicture,
      ...(slideshow.pictureLength === undefined ? {} : { pictureLength: slideshow.pictureLength }),
      ...(slideshow.ownOrder ? { ownOrder: true } : {}),
      ...(slideshow.transition === undefined ? {} : { transition: slideshow.transition }),
      ...(slideshow.portraitPictures === undefined
        ? {}
        : { portraitPictures: slideshow.portraitPictures }),
      ...(slideshow.look === undefined ? {} : { look: slideshow.look }),
      ...(slideshow.mood === undefined ? {} : { mood: slideshow.mood }),
      ...(slideshow.energyPacing ? { energyPacing: true } : {}),
      pictures: slideshow.pictures.map(serverPictureFor),
      songs: slideshow.songs.map((song) => ({
        musicId: song.id,
        fileName: song.fileName,
        durationMs: song.durationMs,
        mimeType: song.mimeType,
        ...ownMusicFields(song),
      })),
      ...(slideshow.betweenSongs === undefined ? {} : { betweenSongs: slideshow.betweenSongs }),
      ...(openingCard === undefined ? {} : { openingCard }),
      ...(closingCard === undefined ? {} : { closingCard }),
    },
  };
}

function serverPictureFor(picture: StoredPicture): ServerPicture {
  if (picture.immichAssetId === undefined) {
    throw new Error(
      `picture "${picture.fileName}" (${picture.id}) has no immichAssetId: a server slideshow only links pictures from Immich`,
    );
  }
  return { ...pictureFieldsOf(picture), immichAssetId: picture.immichAssetId };
}

function pictureFieldsOf(picture: PictureFields): PictureFields {
  return {
    capturedAt: picture.capturedAt,
    width: picture.width,
    height: picture.height,
    fileName: picture.fileName,
    colours: picture.colours,
    ...(picture.kenBurns === undefined ? {} : { kenBurns: picture.kenBurns }),
    ...(picture.caption === undefined ? {} : { caption: picture.caption }),
    ...(picture.durationMs === undefined ? {} : { durationMs: picture.durationMs }),
    ...(picture.transition === undefined ? {} : { transition: picture.transition }),
    ...(picture.alone ? { alone: true } : {}),
  };
}

/** The server slideshow `id` as the app keeps it: each picture's id is its `immichAssetId`. */
export function storedSlideshowFrom(id: string, document: ServerDocument): StoredSlideshow {
  const {
    pictures,
    songs,
    openingCard: manifestOpeningCard,
    closingCard: manifestClosingCard,
    ...settings
  } = document.slideshow;
  const storedPictures = pictures.map((picture) => ({
    id: picture.immichAssetId,
    ...pictureFieldsOf(picture),
    immichAssetId: picture.immichAssetId,
  }));
  const pictureIds = storedPictures.map((picture) => picture.id);
  const openingCard = cardFromManifest(manifestOpeningCard, pictureIds);
  const closingCard = cardFromManifest(manifestClosingCard, pictureIds);
  return {
    id,
    ...settings,
    pictures: storedPictures,
    songs: songs.map((song) => ({
      id: song.musicId,
      fileName: song.fileName,
      durationMs: song.durationMs,
      mimeType: song.mimeType,
      ...ownMusicFields(song),
    })),
    ...(openingCard === undefined ? {} : { openingCard }),
    ...(closingCard === undefined ? {} : { closingCard }),
  };
}
