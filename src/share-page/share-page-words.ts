import type { PageCopy } from "../html-export/page-contract";
import { MILLISECONDS_PER_SECOND } from "../player/slideshow";
import { formatPlayTime } from "../export-player/play-time";
import { TV_TEXT_KEYS, type TvPageWords } from "./tv-page-words";

/**
 * The words a player page's start card and controls need (`pageCopyFor`), in one language: the
 * share page's and a `.glissando` file's `index.html`'s, both built from the catalogue.
 */
export interface PlayerPageWords {
  readonly eyebrow: string;
  /** "{pictures} · {duration} · {music}". */
  readonly summary: string;
  /** "{count} picture" / "{count} pictures". */
  readonly pictures: { readonly one: string; readonly other: string };
  readonly withMusic: string;
  readonly withoutMusic: string;
  readonly madeWith: string;
  readonly play: string;
  readonly pause: string;
  readonly mute: string;
  readonly unmute: string;
  readonly fullScreen: string;
  readonly timeline: string;
  readonly playAgain: string;
  readonly cannotPlay: string;
  readonly noscript: string;
}

/** `PlayerPageWords`' plain texts; `pictures` is the one plural. */
export const PLAYER_TEXT_KEYS = [
  "eyebrow",
  "summary",
  "withMusic",
  "withoutMusic",
  "madeWith",
  "play",
  "pause",
  "mute",
  "unmute",
  "fullScreen",
  "timeline",
  "playAgain",
  "cannotPlay",
  "noscript",
] as const satisfies readonly Exclude<keyof PlayerPageWords, "pictures">[];

/**
 * The share page's words in one language, as the catalogue holds them (`sharePage.*` and the
 * export page's `htmlPage.*`): built into the page for both languages, and filled in by the
 * page, which only learns the slideshow once it has loaded (dev-docs/SHARE_LINK.md).
 */
export interface SharePageWords extends PlayerPageWords, TvPageWords {
  /** After Play, until the player plays. */
  readonly loadingFirst: string;
  /** The chip while the player waits for a late picture. */
  readonly loadingLate: string;
  readonly goneTitle: string;
  readonly goneText: string;
  readonly unreachableTitle: string;
  readonly unreachableText: string;
  readonly tryAgain: string;
}

/** Every word that is plain text; `pictures` is the one plural. */
export const SHARE_TEXT_KEYS = [
  ...PLAYER_TEXT_KEYS,
  "loadingFirst",
  "loadingLate",
  "goneTitle",
  "goneText",
  "unreachableTitle",
  "unreachableText",
  "tryAgain",
  ...TV_TEXT_KEYS,
] as const satisfies readonly Exclude<keyof SharePageWords, "pictures">[];

export const SHARE_PAGE_LANGUAGES = ["de", "en"] as const;
export type SharePageLanguage = (typeof SHARE_PAGE_LANGUAGES)[number];
export type SharePageLanguages = Readonly<Record<SharePageLanguage, SharePageWords>>;

const GERMAN_PREFIX = "de";
/** Regional formats per language, as the app uses them. */
const LOCALES: Readonly<Record<SharePageLanguage, string>> = { de: "de-DE", en: "en-GB" };
const PLACEHOLDER = /\{(\w+)\}/g;

/** German for a browser in German, English for every other. */
export function shareLanguage(browserLanguage: string): SharePageLanguage {
  return browserLanguage.toLowerCase().startsWith(GERMAN_PREFIX) ? "de" : "en";
}

/** What the start card sums up. */
export interface ShareSummary {
  readonly pictureCount: number;
  readonly durationMs: number;
  readonly withMusic: boolean;
}

/** The player page's words for a loaded slideshow. */
export function pageCopyFor(
  words: PlayerPageWords,
  language: SharePageLanguage,
  summary: ShareSummary,
): PageCopy {
  const locale = LOCALES[language];
  const count = summary.pictureCount;
  const pictures =
    new Intl.PluralRules(locale).select(count) === "one"
      ? words.pictures.one
      : words.pictures.other;
  return {
    eyebrow: words.eyebrow,
    summary: fill(words.summary, {
      pictures: fill(pictures, { count: new Intl.NumberFormat(locale).format(count) }),
      duration: formatPlayTime(summary.durationMs / MILLISECONDS_PER_SECOND),
      music: summary.withMusic ? words.withMusic : words.withoutMusic,
    }),
    madeWith: words.madeWith,
    play: words.play,
    pause: words.pause,
    mute: words.mute,
    unmute: words.unmute,
    fullScreen: words.fullScreen,
    timeline: words.timeline,
    playAgain: words.playAgain,
    cannotPlay: words.cannotPlay,
  };
}

/** `template` with each `{name}` replaced by `values[name]`. */
export function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(PLACEHOLDER, (placeholder, name: string) => {
    const value = values[name];
    if (value === undefined) {
      throw new Error(`the share page's words have an unknown placeholder ${placeholder}`);
    }
    return value;
  });
}
