import type { MusicBeats } from "../beats";
import type { MusicLoudness } from "../loudness";
import type { CardSwatchId } from "../player/card-palette";
import type { CardEntrance, CardPosition, CardStyle } from "../player/slideshow";
import type { OwnKenBurns } from "./own-ken-burns";
import type { StoredVideo } from "./own-video";
import type { PictureColours } from "./picture-colours";
import type { StoredFocus } from "./picture-focus";
import type { PictureLength } from "./picture-length";
import type { PortraitPictures } from "./portrait-pictures";
import type { BetweenSongs, MusicTrim, PictureChanges } from "./own-music";
import type { SlideshowTransition, TransitionChoice } from "./own-timing";

/**
 * A slideshow as kept on the device: the user's pictures and music plus the few settings the
 * MVP has. The playable slideshow JSON is composed from it (see `src/compose/`), so every
 * automatic choice follows the current rules.
 */

/**
 * Each picture without an own duration stays this long, without music or with music the pictures
 * do not fill (`StoredSlideshow.pictureLength`); the user changes it in half-second steps.
 */
export const DEFAULT_SECONDS_PER_PICTURE = 5;
export const SECONDS_PER_PICTURE_STEP = 0.5;
export const MIN_SECONDS_PER_PICTURE = 2;
export const MAX_SECONDS_PER_PICTURE = 15;

export interface StoredPicture {
  readonly id: string;
  /** ISO 8601 date-time, capture time from EXIF or the file date. */
  readonly capturedAt: string;
  /** Size of the stored, downscaled picture in pixels. */
  readonly width: number;
  readonly height: number;
  readonly fileName: string;
  /** The user's own motion for this picture; absent while it is automatic (see ADR-0006). */
  readonly kenBurns?: OwnKenBurns;
  /** Shown with the picture in the player; absent: none. Normalised (`normalizeCaption`). */
  readonly caption?: string;
  /** How long the picture shows, in whole ms (`checkOwnDurationMs`); absent: automatic. */
  readonly durationMs?: number;
  /**
   * How the picture hands over to the next one; absent: automatic. Kept on the last picture but
   * not applied there (see ADR-0008).
   */
  readonly transition?: TransitionChoice;
  /** Origin: the Immich asset it was downloaded from (see ADR-0016). */
  readonly immichAssetId?: string;
  /** Origin: the size of the original file in bytes (see ADR-0016). */
  readonly fileBytes?: number;
  /** Never composed into a portrait pair, even automatically; absent: it may be (ADR-0028). */
  readonly alone?: true;
  /** The clip this picture is the poster of; absent: a plain picture (ADR-0034). */
  readonly video?: StoredVideo;
  /** Worked out once when the picture is added (`pictureColours`, ADR-0033). */
  readonly colours: PictureColours;
}

/** A card's own ground or veil colour: one of the fixed swatches, or a picture's hex. */
export type CardColour = CardSwatchId | string;

/** The veil's tint over a card's picture background (TITLE_CARD_COMPOSITION.md). */
export type CardTint = "picture" | "light" | "dark";

/** Where a title or closing card sits behind its text (ADR-0032, TITLE_SLIDES.md). */
export type StoredCardBackground =
  | { readonly kind: "colour"; readonly colour: CardColour }
  | {
      readonly kind: "picture";
      readonly pictureId: string;
      /** 0 to 100 in steps of 5; the veil amount is `fade / 100`. */
      readonly fade: number;
      readonly tint: CardTint;
    };

/**
 * The slideshow's title slide (`openingCard`) or closing slide (`closingCard`), ADR-0032. An
 * empty `title` means the slide is not shown (`TITLE_SLIDES.md`); `motion` is the title slide's
 * reveal or the closing slide's fade in, and only applies on a picture background.
 */
export interface StoredCard {
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly style: CardStyle;
  readonly position: CardPosition;
  readonly entrance: CardEntrance;
  readonly background: StoredCardBackground;
  readonly motion: boolean;
}

export interface StoredMusic {
  readonly id: string;
  readonly fileName: string;
  readonly durationMs: number;
  readonly mimeType: string;
  /** The part of the track that plays (`checkMusicTrim`); absent: the whole track (ADR-0009). */
  readonly trim?: MusicTrim;
  /** Own fade-in in whole ms, 0 being off (`checkMusicFadeMs`); absent: automatic. */
  readonly fadeInMs?: number;
  /** Own fade-out in whole ms, 0 being off (`checkMusicFadeMs`); absent: automatic. */
  readonly fadeOutMs?: number;
  /**
   * `"even"`: the pictures share the music evenly (`checkPictureChanges`); absent: automatic, on
   * the beat when one was found (ADR-0021).
   */
  readonly pictureChanges?: PictureChanges;
  /**
   * Own volume in whole dB off the levelled default, `MUSIC_VOLUME_MIN_DB` to
   * `MUSIC_VOLUME_MAX_DB` (`checkMusicVolumeDb`); absent: levelled (0 dB). Never stored as a
   * literal 0 — `setMusicVolume` deletes the field instead (ADR-0040).
   */
  readonly volumeDb?: number;
  /**
   * The id of the Glissando sample track this song is (`checkSampleTrack`); absent for the
   * owner's own music. Set only when the song is added; no edit changes it (SAMPLE_MUSIC.md,
   * ADR-0042).
   */
  readonly sampleTrack?: string;
}

export interface StoredSlideshow {
  readonly id: string;
  readonly title: string;
  /** ISO 8601 date-time. */
  readonly createdAt: string;
  /** In play order; never empty. */
  readonly pictures: readonly StoredPicture[];
  /** The user reordered the pictures; absent while they keep the capture-date order. */
  readonly ownOrder?: true;
  /** The playlist, in play order; empty without music (ADR-0023). */
  readonly songs: readonly StoredMusic[];
  /**
   * `"sequence"`: each song starts at the previous one's end (`checkBetweenSongs`); absent: they
   * crossfade (ADR-0023).
   */
  readonly betweenSongs?: BetweenSongs;
  readonly secondsPerPicture: number;
  /**
   * `"seconds"`: with music too, the pictures last `secondsPerPicture` each, on the beat
   * (`checkPictureLength`); absent: they fill the music (ADR-0022).
   */
  readonly pictureLength?: PictureLength;
  /**
   * The transition every picture without its own hands over with; absent: the crossfade
   * (`DEFAULT_SLIDESHOW_TRANSITION`, see ADR-0010).
   */
  readonly transition?: SlideshowTransition;
  /**
   * How portrait pictures lay out (`checkPortraitPictures`); absent: automatic, pairs and a
   * blurred fill for a whole picture that would otherwise lose too much to the crop (ADR-0028).
   */
  readonly portraitPictures?: PortraitPictures;
  /** The title slide; absent: none (ADR-0032). */
  readonly openingCard?: StoredCard;
  /** The closing slide; absent: none. */
  readonly closingCard?: StoredCard;
}

/** A picture's two stored renditions. */
export interface PictureBlobs {
  /** Downscaled to display resolution; what the player shows. */
  readonly display: Blob;
  /** Small rendition for tiles and covers. */
  readonly thumbnail: Blob;
}

/**
 * Persistent storage of slideshows and their media. Media is written while importing, the
 * slideshow record last; media no saved slideshow references is an abandoned import.
 */
export interface LibraryStore {
  putPicture(id: string, blobs: PictureBlobs): Promise<void>;
  putMusic(id: string, blob: Blob): Promise<void>;
  /** Stores a video's original file under its media id (`StoredVideo.mediaId`). */
  putVideo(id: string, blob: Blob): Promise<void>;
  /** Writes the record atomically; replaces one with the same id. */
  saveSlideshow(slideshow: StoredSlideshow): Promise<void>;
  /**
   * Replaces a stored record, reading it in the same transaction: throws
   * `SlideshowNotFoundError` when it is gone, so an edit never brings a deleted slideshow back.
   */
  updateSlideshow(slideshow: StoredSlideshow): Promise<void>;
  /**
   * Replaces the stored record `id` with `edit` of it, read and written in one transaction, so
   * nothing written meanwhile is lost; resolves with the result. Throws `SlideshowNotFoundError`
   * when it is gone, and `edit`'s own error with the record left as it was.
   */
  updateSlideshowWith(
    id: string,
    edit: (current: StoredSlideshow) => StoredSlideshow,
  ): Promise<StoredSlideshow>;
  /** Newest first. */
  listSlideshows(): Promise<readonly StoredSlideshow[]>;
  /** Throws `SlideshowNotFoundError` for an unknown id. */
  getSlideshow(id: string): Promise<StoredSlideshow>;
  /**
   * Deletes the record and, in the same transaction, the media (pictures, music, videos) only it
   * references, those pictures' focus and that music's beats and loudness. Throws
   * `SlideshowNotFoundError` for an unknown id.
   */
  deleteSlideshow(id: string): Promise<void>;
  /** `signal` cancels a download where reading the picture needs one. */
  pictureBlob(id: string, signal?: AbortSignal): Promise<Blob>;
  /** The picture as the player shows it: on the device, its display rendition. */
  playbackPictureBlob(id: string, signal?: AbortSignal): Promise<Blob>;
  thumbnailBlob(id: string): Promise<Blob>;
  musicBlob(id: string): Promise<Blob>;
  /** Throws `MediaNotFoundError` for an unknown media id. */
  videoBlob(id: string): Promise<Blob>;
  /**
   * Stores what the detection found in a picture and the detector version that found it, beside
   * its media (ADR-0012, ADR-0041). A picture whose media is not stored (any more) keeps nothing,
   * so a late detection cannot resurrect it.
   */
  putPictureFocus(pictureId: string, focus: StoredFocus): Promise<void>;
  /** The stored focus of each picture asked for; a picture not looked at yet is absent. */
  pictureFocus(pictureIds: readonly string[]): Promise<ReadonlyMap<string, StoredFocus>>;
  /**
   * Stores the beats the detection found in a track, beside its media (ADR-0021). A track whose
   * media is not stored (any more) keeps nothing, so a late detection cannot resurrect it.
   */
  putMusicBeats(musicId: string, beats: MusicBeats): Promise<void>;
  /** The stored beats of a track; `undefined` while it was not listened to yet. */
  musicBeats(musicId: string): Promise<MusicBeats | undefined>;
  /**
   * Stores the loudness measured for a track, beside its media (dev-docs/library/MUSIC.md). A
   * track whose media is not stored (any more) keeps nothing, so a late measurement cannot
   * resurrect it.
   */
  putMusicLoudness(musicId: string, loudness: MusicLoudness): Promise<void>;
  /** The stored loudness of a track; `undefined` while it was not measured yet (played unlevelled). */
  musicLoudness(musicId: string): Promise<MusicLoudness | undefined>;
  /** The bytes the slideshow's pictures (both renditions), music and videos take; missing media counts 0. */
  mediaBytes(slideshow: StoredSlideshow): Promise<number>;
  /**
   * Claims a media id no saved slideshow references (yet or any more), so a clean-up in any tab
   * spares it: an import in progress claims its media before writing it, a removal its pictures
   * while it can be undone. The first claim under `claimId` records `startedAt`.
   */
  claimMedia(claimId: string, startedAt: Date, mediaId: string): Promise<void>;
  /** The import was created or discarded, the removal undone or final: its media is spared no longer. */
  releaseClaim(claimId: string): Promise<void>;
  /**
   * Deletes media (pictures with their focus, music with its beats, videos) no saved slideshow references, sparing that of
   * claims made less than `CLAIM_SPARED_FOR_MS` before `now`; older claims are taken for crashed
   * and forgotten.
   */
  deleteUnreferencedMedia(now: Date): Promise<void>;
}

/**
 * What the library, a slideshow's screen, its editors, the player and the exports need of a
 * store: the device's `LibraryStore` has it, and so has the server's (`ServerSlideshowStore`).
 */
export type SlideshowStore = Pick<
  LibraryStore,
  | "listSlideshows"
  | "getSlideshow"
  | "updateSlideshow"
  | "updateSlideshowWith"
  | "deleteSlideshow"
  | "pictureBlob"
  | "playbackPictureBlob"
  | "thumbnailBlob"
  | "musicBlob"
  | "pictureFocus"
  | "putPictureFocus"
>;

/** How long a claim spares its media; a tab that crashed never releases its claims. */
export const CLAIM_SPARED_FOR_MS = 24 * 60 * 60 * 1000;

/** The stored record of a claim: an import in progress or an undoable removal. */
export interface MediaClaim {
  readonly id: string;
  /** ISO 8601. */
  readonly startedAt: string;
  readonly mediaIds: readonly string[];
}

export class SlideshowNotFoundError extends Error {
  constructor(readonly slideshowId: string) {
    super(`no slideshow with id "${slideshowId}" is stored on this device`);
    this.name = "SlideshowNotFoundError";
  }
}

/** Media a store was asked for but does not hold. */
export class MediaNotFoundError extends Error {
  constructor(readonly mediaId: string) {
    super(`no media with id "${mediaId}" is stored on this device`);
    this.name = "MediaNotFoundError";
  }
}
