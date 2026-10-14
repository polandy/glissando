import type { OwnKenBurns } from "../library/own-ken-burns";
import type { PictureLength } from "../library/picture-length";
import type { PortraitPictures } from "../library/portrait-pictures";
import type { BetweenSongs, MusicTrim, PictureChanges } from "../library/own-music";
import type { SlideshowTransition, TransitionChoice } from "../library/own-timing";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { cardToManifest, type ManifestCard } from "./manifest-card";

/**
 * `glissando.json`, the first entry of a .glissando file: the format's id and version and the
 * slideshow as stored, with media named by their path in the container instead of a device id.
 */

export const GLISSANDO_FORMAT_ID = "glissando";
/**
 * Version 2 added a picture's own Ken Burns motion (ADR-0006), version 3 its caption, version 4
 * its own duration and transition (ADR-0008), version 5 the music's excerpt and fades
 * (ADR-0009), version 6 the slideshow's default transition (ADR-0010), version 7 a picture's
 * origin, `immichAssetId` or `fileBytes` (ADR-0016), version 8 the music's picture changes
 * (ADR-0021), version 9 the slideshow's picture length (ADR-0022), version 10 the playlist,
 * `songs` and `betweenSongs` replacing the single `music` (ADR-0023), version 11 the slideshow's
 * `portraitPictures` and a picture's `alone` (ADR-0028), version 12 the slideshow's `openingCard`
 * and `closingCard` (ADR-0032). A file older than version 10 carried `music`, not `songs`, with
 * no automatic way to tell the two apart in a document that also predates other fields; such a
 * file is reported like any other unsupported version.
 */
export const GLISSANDO_FORMAT_VERSION = 12;
export const OLDEST_READABLE_FORMAT_VERSION = 12;
/** The first version that carries a picture's own motion. */
export const OWN_KEN_BURNS_FROM_VERSION = 2;
/** The first version that carries a picture's caption. */
export const CAPTION_FROM_VERSION = 3;
/** The first version that carries a picture's own duration and transition. */
export const OWN_TIMING_FROM_VERSION = 4;
/** The first version that carries the music's excerpt and fades. */
export const MUSIC_TRIM_FROM_VERSION = 5;
/** The first version that carries the slideshow's default transition. */
export const DEFAULT_TRANSITION_FROM_VERSION = 6;
/** The first version that carries a picture's origin, `immichAssetId` or `fileBytes`. */
export const ORIGIN_FROM_VERSION = 7;
/** The first version that carries the music's picture changes. */
export const PICTURE_CHANGES_FROM_VERSION = 8;
/** The first version that carries the slideshow's picture length. */
export const PICTURE_LENGTH_FROM_VERSION = 9;
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
  readonly durationMs?: number;
  readonly transition?: TransitionChoice;
  /** Origin: the Immich asset it was downloaded from (see ADR-0016). */
  readonly immichAssetId?: string;
  /** Origin: the size of the original file in bytes (see ADR-0016). */
  readonly fileBytes?: number;
  /** Never composed into a portrait pair, even automatically; absent: it may be (ADR-0028). */
  readonly alone?: true;
}

export interface ManifestMusic {
  readonly file: string;
  readonly fileName: string;
  readonly durationMs: number;
  readonly mimeType: string;
  readonly trim?: MusicTrim;
  readonly fadeInMs?: number;
  readonly fadeOutMs?: number;
  readonly pictureChanges?: PictureChanges;
}

export interface ManifestSlideshow {
  readonly title: string;
  readonly createdAt: string;
  readonly secondsPerPicture: number;
  readonly pictureLength?: PictureLength;
  readonly ownOrder?: true;
  readonly transition?: SlideshowTransition;
  /** How portrait pictures lay out; absent: automatic, pairs and a blurred fill (ADR-0028). */
  readonly portraitPictures?: PortraitPictures;
  readonly pictures: readonly ManifestPicture[];
  /** The playlist, in play order; empty for no music (ADR-0023). */
  readonly songs: readonly ManifestMusic[];
  /** `"sequence"`: one after another; absent: crossfade (ADR-0023). */
  readonly betweenSongs?: BetweenSongs;
  /** The title slide; absent: none (ADR-0032). */
  readonly openingCard?: ManifestCard;
  /** The closing slide; absent: none. */
  readonly closingCard?: ManifestCard;
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

/**
 * Where song `index` (from 0) of the playlist sits in the container: its own path, keeping its
 * file's extension so an unzipped file opens in any player.
 */
export function songPath(index: number, fileName: string): string {
  const base = `music/track-${index + 1}`;
  const extension = MUSIC_EXTENSION.exec(fileName)?.[1];
  return extension === undefined ? base : `${base}.${extension.toLowerCase()}`;
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
  const pictures = slideshow.pictures.map((picture, index): ManifestPicture => ({
    ...picturePaths(index, typesAt(pictureTypes, index)),
    capturedAt: picture.capturedAt,
    width: picture.width,
    height: picture.height,
    fileName: picture.fileName,
    ...(picture.kenBurns === undefined ? {} : { kenBurns: picture.kenBurns }),
    ...(picture.caption === undefined ? {} : { caption: picture.caption }),
    ...(picture.durationMs === undefined ? {} : { durationMs: picture.durationMs }),
    ...(picture.transition === undefined ? {} : { transition: picture.transition }),
    ...(picture.immichAssetId === undefined ? {} : { immichAssetId: picture.immichAssetId }),
    ...(picture.fileBytes === undefined ? {} : { fileBytes: picture.fileBytes }),
    ...(picture.alone === true ? { alone: true } : {}),
  }));
  const songs = slideshow.songs.map((song, index) => ({
    file: songPath(index, song.fileName),
    fileName: song.fileName,
    durationMs: song.durationMs,
    mimeType: song.mimeType,
    ...ownMusicFields(song),
  }));
  const pictureIds = slideshow.pictures.map((picture) => picture.id);
  const openingCard = cardToManifest(slideshow.openingCard, pictureIds);
  const closingCard = cardToManifest(slideshow.closingCard, pictureIds);
  return {
    format: GLISSANDO_FORMAT_ID,
    formatVersion: GLISSANDO_FORMAT_VERSION,
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
      pictures,
      songs,
      ...(slideshow.betweenSongs === undefined ? {} : { betweenSongs: slideshow.betweenSongs }),
      ...(openingCard === undefined ? {} : { openingCard }),
      ...(closingCard === undefined ? {} : { closingCard }),
    },
  };
}

type OwnMusicFields = Pick<ManifestMusic, "trim" | "fadeInMs" | "fadeOutMs" | "pictureChanges">;

/**
 * The music's own excerpt, fades and picture changes, those it has; shared by both directions of
 * the file.
 */
export function ownMusicFields(music: OwnMusicFields): OwnMusicFields {
  return {
    ...(music.trim === undefined ? {} : { trim: music.trim }),
    ...(music.fadeInMs === undefined ? {} : { fadeInMs: music.fadeInMs }),
    ...(music.fadeOutMs === undefined ? {} : { fadeOutMs: music.fadeOutMs }),
    ...(music.pictureChanges === undefined ? {} : { pictureChanges: music.pictureChanges }),
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
