import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { ownMusicFields } from "../glissando-file/glissando-manifest";
import { DocumentFormatError, readObject, readText } from "../glissando-file/document-values";
import {
  musicKeys,
  pictureKeys,
  readMusicFields,
  readPictureFields,
  readPictures,
  readSlideshowFields,
  slideshowKeys,
  type MusicFields,
  type PictureFields,
  type SlideshowFields,
} from "../glissando-file/slideshow-fields";

/**
 * A slideshow on the Glissando server: the .glissando manifest's slideshow with every picture
 * linked from Immich and the music named by the server's id (`dev-docs/SERVER_LIBRARY.md`, The
 * server document). Shared by the app and the server.
 */

export const SERVER_DOCUMENT_FORMAT_ID = "glissando-server";
export const SERVER_DOCUMENT_FORMAT_VERSION = 1;
/** The manifest format version whose slideshow fields a server document carries. */
const MANIFEST_FIELDS_VERSION = 7;

export interface ServerPicture extends PictureFields {
  readonly immichAssetId: string;
}

export interface ServerMusic extends MusicFields {
  /** The server's id of the uploaded file. */
  readonly musicId: string;
}

export interface ServerSlideshow extends SlideshowFields {
  readonly pictures: readonly ServerPicture[];
  readonly music?: ServerMusic;
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
  const show = readObject(root["slideshow"], path, slideshowKeys(MANIFEST_FIELDS_VERSION));
  const pictures = readPictures(show, path, readPicture);
  refuseRepeatedAssets(pictures, path);
  return {
    format: SERVER_DOCUMENT_FORMAT_ID,
    formatVersion: SERVER_DOCUMENT_FORMAT_VERSION,
    slideshow: {
      ...readSlideshowFields(show, path),
      pictures,
      ...(show["music"] === undefined ? {} : { music: readMusic(show["music"], `${path}.music`) }),
    },
  };
}

function readPicture(value: unknown, path: string): ServerPicture {
  const picture = readObject(value, path, [
    ...pictureKeys(MANIFEST_FIELDS_VERSION),
    "immichAssetId",
  ]);
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
  const music = readObject(value, path, [...musicKeys(MANIFEST_FIELDS_VERSION), "musicId"]);
  return {
    ...readMusicFields(music, path),
    musicId: readText(music["musicId"], `${path}.musicId`),
  };
}

/**
 * The server document of `slideshow`, whose pictures are all linked from Immich and whose
 * music's `id` is the server's `musicId`.
 */
export function serverDocumentFor(slideshow: StoredSlideshow): ServerDocument {
  const { music } = slideshow;
  return {
    format: SERVER_DOCUMENT_FORMAT_ID,
    formatVersion: SERVER_DOCUMENT_FORMAT_VERSION,
    slideshow: {
      title: slideshow.title,
      createdAt: slideshow.createdAt,
      secondsPerPicture: slideshow.secondsPerPicture,
      ...(slideshow.ownOrder ? { ownOrder: true } : {}),
      ...(slideshow.transition === undefined ? {} : { transition: slideshow.transition }),
      pictures: slideshow.pictures.map(serverPictureFor),
      ...(music === undefined
        ? {}
        : {
            music: {
              musicId: music.id,
              fileName: music.fileName,
              durationMs: music.durationMs,
              mimeType: music.mimeType,
              ...ownMusicFields(music),
            },
          }),
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
    ...(picture.kenBurns === undefined ? {} : { kenBurns: picture.kenBurns }),
    ...(picture.caption === undefined ? {} : { caption: picture.caption }),
    ...(picture.durationMs === undefined ? {} : { durationMs: picture.durationMs }),
    ...(picture.transition === undefined ? {} : { transition: picture.transition }),
  };
}

/** The server slideshow `id` as the app keeps it: each picture's id is its `immichAssetId`. */
export function storedSlideshowFrom(id: string, document: ServerDocument): StoredSlideshow {
  const { pictures, music, ...settings } = document.slideshow;
  return {
    id,
    ...settings,
    pictures: pictures.map((picture) => ({
      id: picture.immichAssetId,
      ...pictureFieldsOf(picture),
      immichAssetId: picture.immichAssetId,
    })),
    ...(music === undefined
      ? {}
      : {
          music: {
            id: music.musicId,
            fileName: music.fileName,
            durationMs: music.durationMs,
            mimeType: music.mimeType,
            ...ownMusicFields(music),
          },
        }),
  };
}
