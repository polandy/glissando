import type { OwnKenBurns } from "../library/own-ken-burns";
import type { PictureColours } from "../library/picture-colours";
import type { PictureLength } from "../library/picture-length";
import type { PortraitPictures } from "../library/portrait-pictures";
import type { BetweenSongs, MusicTrim, PictureChanges } from "../library/own-music";
import type { SlideshowTransition, TransitionChoice } from "../library/own-timing";
import type { StoredVideo } from "../library/own-video";
import type { StoredSlideshow } from "../library/stored-slideshow";
import type { Place } from "../places/nearest-place";
import {
  addedChaptersToManifest,
  chapterEditsToManifest,
  type ManifestAddedChapter,
  type ManifestChapterEdit,
} from "./manifest-chapters";
import { cardToManifest, type ManifestCard } from "./manifest-card";
import {
  clipMimeType,
  clipPath,
  distinctClipIds,
  videoToManifest,
  type ManifestVideo,
} from "./manifest-video";
import { picturePaths, songPath, typesAt, type PictureTypes } from "./manifest-paths";

export {
  PICTURE_FILE_EXTENSIONS,
  PICTURE_NUMBER_DIGITS,
  picturePaths,
  songPath,
  thumbnailPath,
  typeOfPicturePath,
  type PictureTypes,
} from "./manifest-paths";

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
 * and `closingCard` (ADR-0032), version 13 a picture's `colours` and a card's picture background
 * `tint` (ADR-0033), version 14 a picture's `video` and the `videos/` entries (ADR-0034), version
 * 15 a song's own volume, `volumeDb` (ADR-0040), version 16 a song's sample-track id,
 * `sampleTrack` (ADR-0042), version 17 a picture's resolved `place` (ADR-0043) and a slideshow's
 * trip chapters, `automaticChaptersOff`, `chapterEdits` and `addedChapters`
 * (`dev-docs/player/TRIP_CHAPTERS.md`).
 *
 * Versions 13 to 17 are read (a version 13 file holds no clips, versions 13 and 14 no song
 * volume, versions 13 to 15 no sample-track id, and versions 13 to 16 no place or chapters). Any
 * older file is refused rather than migrated, as there is no production instance yet; before
 * version 10 a file carried `music`, not `songs`, which cannot be told apart from the rest of
 * such a document.
 */
export const GLISSANDO_FORMAT_VERSION = 17;
export const OLDEST_READABLE_FORMAT_VERSION = 13;
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
/** The first version that carries a song's own volume. */
export const MUSIC_VOLUME_FROM_VERSION = 15;
/** The first version that carries a song's sample-track id. */
export const SAMPLE_TRACK_FROM_VERSION = 16;
/** The first version that carries a picture's resolved place. */
export const PLACE_FROM_VERSION = 17;
/** The first version that carries a slideshow's trip chapters. */
export const TRIP_CHAPTERS_FROM_VERSION = 17;
export const MANIFEST_ENTRY_NAME = "glissando.json";

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
  /** Worked out once when the picture is added (ADR-0033). */
  readonly colours: PictureColours;
  /** The clip the slide plays; the picture is its poster (ADR-0034). */
  readonly video?: ManifestVideo;
  /** The nearest bundled place to the picture's GPS, resolved at import; absent: none (ADR-0043). */
  readonly place?: Place;
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
  readonly volumeDb?: number;
  /** The id of the Glissando sample track this song is; absent for the owner's own music. */
  readonly sampleTrack?: string;
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
  /** Automatic chapters turned off; absent: on (`dev-docs/player/TRIP_CHAPTERS.md`). */
  readonly automaticChaptersOff?: true;
  /** An automatic chapter's title, subtitle or visibility, overridden; absent: none. */
  readonly chapterEdits?: readonly ManifestChapterEdit[];
  /** A chapter added where none was automatic; absent: none. */
  readonly addedChapters?: readonly ManifestAddedChapter[];
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

/** The manifest of `slideshow`; `pictureTypes` holds each picture's types, in play order. */
export function manifestFor(
  slideshow: StoredSlideshow,
  pictureTypes: readonly PictureTypes[],
  clipTypes: ReadonlyMap<string, string> = new Map(),
): GlissandoManifest {
  const clipFiles = new Map(
    distinctClipIds(slideshow.pictures).map((mediaId, index) => {
      const mimeType = clipMimeType(clipTypes.get(mediaId) ?? "");
      return [mediaId, { file: clipPath(index, mimeType), mimeType }] as const;
    }),
  );
  const pictures = slideshow.pictures.map((picture, index): ManifestPicture => ({
    ...picturePaths(index, typesAt(pictureTypes, index)),
    capturedAt: picture.capturedAt,
    width: picture.width,
    height: picture.height,
    fileName: picture.fileName,
    colours: picture.colours,
    ...(picture.kenBurns === undefined ? {} : { kenBurns: picture.kenBurns }),
    ...(picture.caption === undefined ? {} : { caption: picture.caption }),
    ...(picture.durationMs === undefined ? {} : { durationMs: picture.durationMs }),
    ...(picture.transition === undefined ? {} : { transition: picture.transition }),
    ...(picture.immichAssetId === undefined ? {} : { immichAssetId: picture.immichAssetId }),
    ...(picture.fileBytes === undefined ? {} : { fileBytes: picture.fileBytes }),
    ...(picture.alone === true ? { alone: true } : {}),
    ...(picture.video === undefined ? {} : { video: manifestVideo(picture.video, clipFiles) }),
    ...(picture.place === undefined ? {} : { place: picture.place }),
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
  const chapterEdits = chapterEditsToManifest(slideshow.chapterEdits, pictureIds);
  const addedChapters = addedChaptersToManifest(slideshow.addedChapters, pictureIds);
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
      ...(slideshow.automaticChaptersOff ? { automaticChaptersOff: true } : {}),
      ...(chapterEdits === undefined ? {} : { chapterEdits }),
      ...(addedChapters === undefined ? {} : { addedChapters }),
    },
  };
}

function manifestVideo(
  video: StoredVideo,
  clipFiles: ReadonlyMap<string, { readonly file: string; readonly mimeType: string }>,
): ManifestVideo {
  const clip = clipFiles.get(video.mediaId);
  if (clip === undefined) {
    throw new Error(`clip ${video.mediaId} was never read: pass its type`);
  }
  return videoToManifest(video, clip.file, clip.mimeType);
}

type OwnMusicFields = Pick<
  ManifestMusic,
  "trim" | "fadeInMs" | "fadeOutMs" | "pictureChanges" | "volumeDb" | "sampleTrack"
>;

/**
 * The music's own excerpt, fades, picture changes, volume and sample-track id, those it has;
 * shared by both directions of the file.
 */
export function ownMusicFields(music: OwnMusicFields): OwnMusicFields {
  return {
    ...(music.trim === undefined ? {} : { trim: music.trim }),
    ...(music.fadeInMs === undefined ? {} : { fadeInMs: music.fadeInMs }),
    ...(music.fadeOutMs === undefined ? {} : { fadeOutMs: music.fadeOutMs }),
    ...(music.pictureChanges === undefined ? {} : { pictureChanges: music.pictureChanges }),
    ...(music.volumeDb === undefined ? {} : { volumeDb: music.volumeDb }),
    ...(music.sampleTrack === undefined ? {} : { sampleTrack: music.sampleTrack }),
  };
}
