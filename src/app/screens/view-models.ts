import type { SlideshowChapter } from "../../compose/chapters-of-slideshow";
import type { SlideshowTransition, TransitionChoice } from "../../library/own-timing";
import type { PictureColours } from "../../library/picture-colours";
import type { ResolvedPortraitPictures } from "../../library/portrait-pictures";
import type { SlideshowMood } from "../../library/slideshow-mood";
import type { StoredCard } from "../../library/stored-slideshow";
import type { SlideshowLook } from "../../player/looks/slideshow-look";

/** What the screens show; the composition root derives these from the stored slideshows. */

export interface SlideshowSummary {
  readonly id: string;
  readonly title: string;
  /** Object URLs of the first pictures' thumbnails, in play order; one to three. */
  readonly coverUrls: readonly string[];
  readonly pictureCount: number;
  readonly durationSeconds: number;
  readonly hasMusic: boolean;
}

/** The library's section of server slideshows (`dev-docs/server_library/IN_THE_APP.md`). */
export interface ServerShelf {
  /** The device cannot reach the server: the cards show what it remembers, greyed out. */
  readonly offline: boolean;
  readonly slideshows: readonly SlideshowSummary[];
}

/**
 * Where a slideshow lives, as its screen tells it while the server library is on
 * (`dev-docs/server_library/IN_THE_APP.md`).
 */
export type SlideshowStorage =
  | { readonly kind: "server"; readonly saving: boolean; readonly missingCount: number }
  | { readonly kind: "device"; readonly fromImmich: number; readonly fromDevice: number };

/** What the screen asks of its route about where the slideshow lives. */
export type StorageAction = "keepCopy" | "saveOnServer" | "removeMissing";

export interface PictureTile {
  readonly id: string;
  readonly thumbnailUrl: string;
  /** Immich no longer has the picture: a dashed tile in place of its thumbnail. */
  readonly missing?: true;
  /** ISO 8601 date-time. */
  readonly capturedAt: string;
  /** The length of a video slide's excerpt; absent for a still picture. */
  readonly clipMs?: number;
  /** Shown with the picture in the player; absent: none. Normalised (`normalizeCaption`). */
  readonly caption?: string;
  /** The picture plays a Ken Burns motion of the user's own. */
  readonly ownMotion: boolean;
  /** The picture's own duration; null while automatic. */
  readonly ownDurationMs: number | null;
  /** The own transition it plays into the next picture; null while automatic and at the end. */
  readonly ownTransition: TransitionChoice | null;
  /** The pair partner's number (1-based), when the picture shares a slide with it (ADR-0028). */
  readonly pairedWithNumber: number | null;
  /** Shown whole over a blurred copy of itself because a wide screen would crop too much of it. */
  readonly blurredFill: boolean;
  /** Marked never to be composed into a pair. */
  readonly alone: boolean;
  /** Derived from its pixels (`TITLE_CARD_COLOURS.md`); used for a title card tinted `picture`. */
  readonly colours: PictureColours;
}

/** Which fades the music plays: named in its summary once the user changed the music. */
export type MusicFades = "in-and-out" | "in" | "out";

export interface MusicSummary {
  /** The excerpt in seconds of the track; null: the whole track. */
  readonly excerpt: { readonly fromSeconds: number; readonly toSeconds: number } | null;
  /** Null while the music is untouched, or when it plays no fade. */
  readonly fades: MusicFades | null;
}

export interface SlideshowDetails {
  readonly title: string;
  readonly coverUrl: string;
  readonly durationSeconds: number;
  /** How many songs the playlist has; 0 without music. */
  readonly songCount: number;
  /** The first song's file name, or null without music. */
  readonly musicTitle: string | null;
  /** How long the playlist plays, or null without music. */
  readonly musicSeconds: number | null;
  /** What the music editor changed of the only song; null without music or with several songs. */
  readonly musicSummary: MusicSummary | null;
  /** The user reordered the pictures; otherwise they are in capture-date order. */
  readonly ownOrder: boolean;
  /** Rule C, TRIP_CHAPTERS.md: the owner turned the automatic trip chapters off. */
  readonly automaticChaptersOff: boolean;
  /** Every chapter, automatic and added, in play order (TRIP_CHAPTERS.md). */
  readonly chapters: readonly SlideshowChapter[];
  /** How many pictures play a Ken Burns motion of the user's own. */
  readonly ownMotionCount: number;
  /** How many pictures show for a duration of the user's own. */
  readonly ownDurationCount: number;
  /** How many pictures play an own transition into the next one. */
  readonly ownTransitionCount: number;
  /** The transition of every picture without its own. */
  readonly transition: SlideshowTransition;
  /** The slideshow's mood (ADR-0045); absent is Custom. */
  readonly mood?: SlideshowMood;
  /** The slideshow's colour grade; `"none"` for its absent setting (ADR-0044). */
  readonly look: SlideshowLook;
  /** How portrait pictures lay out; `"automatic"` for the slideshow's absent setting (ADR-0028). */
  readonly portraitPictures: ResolvedPortraitPictures;
  /** How many slides compose two portrait pictures into one pair. */
  readonly pairCount: number;
  /** How many pictures have a caption. */
  readonly captionCount: number;
  /** The earliest and the latest capture date, ISO 8601. */
  readonly capturedFrom: string;
  readonly capturedTo: string;
  /** In play order; never empty. */
  readonly pictures: readonly PictureTile[];
  /** The opening title slide; absent until the editor creates it (TITLE_SLIDES.md). */
  readonly openingCard?: StoredCard;
  /** The closing slide; absent until the editor creates it (TITLE_SLIDES.md). */
  readonly closingCard?: StoredCard;
}
