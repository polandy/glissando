import type { Playback } from "./remote-model.ts";

/**
 * The remote page's words in one language, as the catalogue holds them (`remotePage.*` and
 * the export page's play words): built into remote.html for both languages
 * (dev-docs/tv_remote/REMOTE_PAGE.md).
 */
export const REMOTE_TEXT_KEYS = [
  "showing",
  "connecting",
  "reconnecting",
  "tvAway",
  "tvAwayNote",
  "needsTvOkNote",
  "waiting",
  /** "Picture {number} of {count}". */
  "pictureOf",
  "playing",
  "paused",
  "finished",
  "play",
  "pause",
  "playAgain",
  "previous",
  "next",
  "position",
  "volume",
  "startOver",
  "disconnect",
  "commandFailed",
  "tryAgain",
  "endedTitle",
  "endedText",
  "noscript",
] as const;

export type RemotePageWords = Readonly<Record<(typeof REMOTE_TEXT_KEYS)[number], string>>;

export const REMOTE_PAGE_LANGUAGES = ["de", "en"] as const;
export type RemotePageLanguage = (typeof REMOTE_PAGE_LANGUAGES)[number];
export type RemotePageLanguages = Readonly<Record<RemotePageLanguage, RemotePageWords>>;

const GERMAN_PREFIX = "de";
/** Regional formats per language, as the app uses them. */
const LOCALES: Readonly<Record<RemotePageLanguage, string>> = { de: "de-DE", en: "en-GB" };
const PLACEHOLDER = /\{(\w+)\}/g;
const LINE_SEPARATOR = " · ";

/** German for a browser in German, English for every other. */
export function remoteLanguage(browserLanguage: string): RemotePageLanguage {
  return browserLanguage.toLowerCase().startsWith(GERMAN_PREFIX) ? "de" : "en";
}

/** "Picture 19 of 48 · Playing". */
export function showLine(
  words: RemotePageWords,
  language: RemotePageLanguage,
  show: {
    readonly pictureNumber: number;
    readonly pictureCount: number;
    readonly playback: Playback;
  },
): string {
  const number = new Intl.NumberFormat(LOCALES[language]);
  const picture = fill(words.pictureOf, {
    number: number.format(show.pictureNumber),
    count: number.format(show.pictureCount),
  });
  return `${picture}${LINE_SEPARATOR}${words[show.playback]}`;
}

/** A remote page whose words block is missing or broken: a build fault, never the remote's. */
export class RemoteWordsError extends Error {
  override readonly name = "RemoteWordsError";
}

/** The page's words block, both languages. */
export function readRemoteWords(text: string | null): RemotePageLanguages {
  if (text === null) throw new RemoteWordsError("the remote page holds no words block");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error: unknown) {
    throw new RemoteWordsError("the remote page's words block is no JSON", { cause: error });
  }
  return { de: readWords(field(json, "de"), "de"), en: readWords(field(json, "en"), "en") };
}

function readWords(json: unknown, language: RemotePageLanguage): RemotePageWords {
  if (json === undefined) throw new RemoteWordsError(`the remote page has no ${language} words`);
  return Object.fromEntries(
    REMOTE_TEXT_KEYS.map((key) => {
      const value = field(json, key);
      if (typeof value !== "string") {
        throw new RemoteWordsError(`the remote page's ${language} words need "${key}" as text`);
      }
      return [key, value];
    }),
  ) as RemotePageWords;
}

function field(json: unknown, key: string): unknown {
  return typeof json === "object" && json !== null ? Reflect.get(json, key) : undefined;
}

function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(PLACEHOLDER, (placeholder, name: string) => {
    const value = values[name];
    if (value === undefined) {
      throw new RemoteWordsError(
        `the remote page's words have an unknown placeholder ${placeholder}`,
      );
    }
    return value;
  });
}
