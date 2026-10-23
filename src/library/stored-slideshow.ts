import type { CardSwatchId } from "../player/card-palette";
import type { GradedSlideshowLook } from "../player/looks/slideshow-look";
import type { CardEntrance, CardPosition, CardStyle } from "../player/slideshow";
import type { Place } from "../places/nearest-place";
import type { OwnKenBurns } from "./own-ken-burns";
import type { StoredVideo } from "./own-video";
import type { PictureColours } from "./picture-colours";
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
  /** The nearest bundled place to the picture's GPS, resolved at import; absent: none (ADR-0043). */
  readonly place?: Place;
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

/**
 * An override of one automatic chapter's text or visibility, keyed by its stay's first picture
 * (Rule E, `TRIP_CHAPTERS.md`). A field left out keeps the automatic text for that field.
 */
export interface ChapterEdit {
  readonly pictureId: string;
  readonly title?: string;
  readonly subtitle?: string;
  /** The chapter is not shown; its picture still plays normally. */
  readonly hidden?: true;
}

/** A chapter the user added by hand, before a picture of their choosing (`TRIP_CHAPTERS.md`). */
export interface AddedChapter {
  readonly beforePictureId: string;
  readonly title?: string;
  readonly subtitle?: string;
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
   * The colour grade of every picture and video layer; absent: none (`DEFAULT_SLIDESHOW_LOOK`,
   * see ADR-0044).
   */
  readonly look?: GradedSlideshowLook;
  /**
   * How portrait pictures lay out (`checkPortraitPictures`); absent: automatic, pairs and a
   * blurred fill for a whole picture that would otherwise lose too much to the crop (ADR-0028).
   */
  readonly portraitPictures?: PortraitPictures;
  /** The title slide; absent: none (ADR-0032). */
  readonly openingCard?: StoredCard;
  /** The closing slide; absent: none. */
  readonly closingCard?: StoredCard;
  /** Automatic chapters are on by default; `true` turns them off (Rule C, `TRIP_CHAPTERS.md`). */
  readonly automaticChaptersOff?: true;
  /** Overrides of automatic chapters' text or visibility, keyed by their anchor picture. */
  readonly chapterEdits?: readonly ChapterEdit[];
  /** Chapters the user added by hand; absent: none. */
  readonly addedChapters?: readonly AddedChapter[];
}
