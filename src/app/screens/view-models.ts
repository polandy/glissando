import type { SlideshowTransition, TransitionChoice } from "../../library/own-timing";

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

/** The library's section of server slideshows (`dev-docs/SERVER_LIBRARY.md`, Library). */
export interface ServerShelf {
  /** The device cannot reach the server: the cards show what it remembers, greyed out. */
  readonly offline: boolean;
  readonly slideshows: readonly SlideshowSummary[];
}

/**
 * Where a slideshow lives, as its screen tells it while the server library is on
 * (`dev-docs/SERVER_LIBRARY.md`, A server slideshow's screen).
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
  /** The picture plays a Ken Burns motion of the user's own. */
  readonly ownMotion: boolean;
  /** The picture's own duration; null while automatic. */
  readonly ownDurationMs: number | null;
  /** The own transition it plays into the next picture; null while automatic and at the end. */
  readonly ownTransition: TransitionChoice | null;
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
  /** The music file's name, or null without music. */
  readonly musicTitle: string | null;
  /** The length of the music's excerpt, or null without music. */
  readonly musicSeconds: number | null;
  /** What the music editor changed, or null without music. */
  readonly musicSummary: MusicSummary | null;
  /** The user reordered the pictures; otherwise they are in capture-date order. */
  readonly ownOrder: boolean;
  /** How many pictures play a Ken Burns motion of the user's own. */
  readonly ownMotionCount: number;
  /** How many pictures show for a duration of the user's own. */
  readonly ownDurationCount: number;
  /** How many pictures play an own transition into the next one. */
  readonly ownTransitionCount: number;
  /** The transition of every picture without its own. */
  readonly transition: SlideshowTransition;
  /** How many pictures have a caption. */
  readonly captionCount: number;
  /** The earliest and the latest capture date, ISO 8601. */
  readonly capturedFrom: string;
  readonly capturedTo: string;
  /** In play order; never empty. */
  readonly pictures: readonly PictureTile[];
}
