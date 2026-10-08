import type { OwnKenBurns } from "../library/own-ken-burns";
import type { StoredSlideshow } from "../library/stored-slideshow";

/**
 * `glissando.json`, the first entry of a .glissando file: the format's id and version and the
 * slideshow as stored, with media named by their path in the container instead of a device id.
 */

export const GLISSANDO_FORMAT_ID = "glissando";
/**
 * Version 2 added a picture's own Ken Burns motion (ADR-0006), version 3 its caption; files of
 * every older version are still read.
 */
export const GLISSANDO_FORMAT_VERSION = 3;
export const OLDEST_READABLE_FORMAT_VERSION = 1;
/** The first version that carries a picture's own motion. */
export const OWN_KEN_BURNS_FROM_VERSION = 2;
/** The first version that carries a picture's caption. */
export const CAPTION_FROM_VERSION = 3;
export const MANIFEST_ENTRY_NAME = "glissando.json";

const PICTURE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const PICTURE_NUMBER_DIGITS = 4;
const MUSIC_EXTENSION = /\.([a-z0-9]{1,8})$/i;

export interface ManifestPicture {
  readonly file: string;
  readonly thumbnail: string;
  readonly capturedAt: string;
  readonly width: number;
  readonly height: number;
  readonly fileName: string;
  readonly kenBurns?: OwnKenBurns;
  readonly caption?: string;
}

export interface ManifestMusic {
  readonly file: string;
  readonly fileName: string;
  readonly durationMs: number;
  readonly mimeType: string;
}

export interface ManifestSlideshow {
  readonly title: string;
  readonly createdAt: string;
  readonly secondsPerPicture: number;
  readonly ownOrder?: true;
  readonly pictures: readonly ManifestPicture[];
  readonly music?: ManifestMusic;
}

export interface GlissandoManifest {
  readonly format: typeof GLISSANDO_FORMAT_ID;
  /** Written as `GLISSANDO_FORMAT_VERSION`; a read file may be older. */
  readonly formatVersion: number;
  readonly slideshow: ManifestSlideshow;
}

export type ManifestReading =
  | { readonly kind: "ok"; readonly manifest: GlissandoManifest }
  | { readonly kind: "foreign" }
  | { readonly kind: "newer" }
  | { readonly kind: "damaged"; readonly reason: string };

/** Where picture `index` (from 0) and its thumbnail sit in the container. */
export function picturePaths(
  index: number,
  types: PictureTypes,
): { readonly file: string; readonly thumbnail: string } {
  const number = String(index + 1).padStart(PICTURE_NUMBER_DIGITS, "0");
  return {
    file: `pictures/${number}.${pictureExtension(types.display)}`,
    thumbnail: `thumbnails/${number}.${pictureExtension(types.thumbnail)}`,
  };
}

/** The music keeps its file's extension, so an unzipped file opens in any player. */
export function musicPath(fileName: string): string {
  const extension = MUSIC_EXTENSION.exec(fileName)?.[1];
  return extension === undefined ? "music/track" : `music/track.${extension.toLowerCase()}`;
}

/** A picture's MIME type from its path's extension; null for one the format does not use. */
export function typeOfPicturePath(path: string): string | null {
  const extension = path.slice(path.lastIndexOf(".") + 1);
  const found = Object.entries(PICTURE_EXTENSIONS).find(([, known]) => known === extension);
  return found?.[0] ?? null;
}

/** A picture's two renditions' MIME types. */
export interface PictureTypes {
  readonly display: string;
  readonly thumbnail: string;
}

/** The manifest of `slideshow`; `pictureTypes` holds each picture's types, in play order. */
export function manifestFor(
  slideshow: StoredSlideshow,
  pictureTypes: readonly PictureTypes[],
): GlissandoManifest {
  const pictures = slideshow.pictures.map((picture, index) => ({
    ...picturePaths(index, typesAt(pictureTypes, index)),
    capturedAt: picture.capturedAt,
    width: picture.width,
    height: picture.height,
    fileName: picture.fileName,
    ...(picture.kenBurns === undefined ? {} : { kenBurns: picture.kenBurns }),
    ...(picture.caption === undefined ? {} : { caption: picture.caption }),
  }));
  const { music } = slideshow;
  return {
    format: GLISSANDO_FORMAT_ID,
    formatVersion: GLISSANDO_FORMAT_VERSION,
    slideshow: {
      title: slideshow.title,
      createdAt: slideshow.createdAt,
      secondsPerPicture: slideshow.secondsPerPicture,
      ...(slideshow.ownOrder ? { ownOrder: true } : {}),
      pictures,
      ...(music === undefined
        ? {}
        : {
            music: {
              file: musicPath(music.fileName),
              fileName: music.fileName,
              durationMs: music.durationMs,
              mimeType: music.mimeType,
            },
          }),
    },
  };
}

function typesAt(pictureTypes: readonly PictureTypes[], index: number): PictureTypes {
  const types = pictureTypes[index];
  if (types === undefined) {
    throw new Error(`picture ${index} has no types: pass one entry per picture`);
  }
  return types;
}

function pictureExtension(type: string): string {
  const extension = PICTURE_EXTENSIONS[type];
  if (extension === undefined) {
    throw new Error(
      `a picture of type "${type}" cannot go into a .glissando file: expected one of ${Object.keys(PICTURE_EXTENSIONS).join(", ")}`,
    );
  }
  return extension;
}
