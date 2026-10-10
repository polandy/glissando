/**
 * What the exported page's markup and its player script agree on (dev-docs/HTML_EXPORT.md,
 * "The page"). Both sides import it, so a renamed id cannot leave the page unreadable.
 */

/** `<script type="application/json">` holding the slideshow in `parseSlideshow` format. */
export const SLIDESHOW_BLOCK_ID = "slideshow";
/** `<script type="application/json">` holding the `PageCopy`. */
export const COPY_BLOCK_ID = "copy";
export const JSON_BLOCK_TYPE = "application/json";
export const MEDIA_BLOCK_TYPE = "application/octet-stream";
/** The attribute of a media block naming its MIME type. */
export const MEDIA_TYPE_ATTRIBUTE = "data-type";
/** The music's `src` and the id of its media block. */
export const MUSIC_KEY = "music";

/** The `image.src` of the slide at `index` and the id of its media block. */
export function pictureKey(index: number): string {
  return `p${index}`;
}

/**
 * The page's state on `<html data-state>`, so a test can wait for "playing" or "ended" by a
 * mutation instead of by time. "loading" shows the start card before Play is wired; "start"
 * means a click on Play is heard.
 */
export const PAGE_STATE_ATTRIBUTE = "data-state";
export type PageState = "loading" | "start" | "playing" | "paused" | "ended" | "error";

/** The page's words, in the app's language at export time; keys are the wire contract. */
export interface PageCopy {
  /** Above the title on the start card: "Diashow". */
  readonly eyebrow: string;
  /** "50 Bilder · 4:10 · mit Musik". */
  readonly summary: string;
  /** At the bottom of the start card: "Erstellt mit Glissando · läuft offline". */
  readonly madeWith: string;
  readonly play: string;
  readonly pause: string;
  readonly mute: string;
  readonly unmute: string;
  readonly fullScreen: string;
  /** The timeline's accessible name. */
  readonly timeline: string;
  readonly playAgain: string;
  /** "Diese Diashow lässt sich hier nicht abspielen." */
  readonly cannotPlay: string;
}

export const PAGE_COPY_KEYS = [
  "eyebrow",
  "summary",
  "madeWith",
  "play",
  "pause",
  "mute",
  "unmute",
  "fullScreen",
  "timeline",
  "playAgain",
  "cannotPlay",
] as const satisfies readonly (keyof PageCopy)[];
