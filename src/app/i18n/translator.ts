import { de } from "./catalogue-de";
import { en } from "./catalogue-en";
import type { Catalogue, Message, MessageArgs, MessageKey, ParamValue } from "./messages";

export const LANGUAGES = ["de", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

const FALLBACK_LANGUAGE: Language = "en";

const CATALOGUES: Readonly<Record<Language, Catalogue>> = { de, en };

/** Regional formats per language; English dates read day first like the German ones. */
const LOCALES: Readonly<Record<Language, string>> = { de: "de-DE", en: "en-GB" };

const SECONDS_PER_MINUTE = 60;
const SECONDS_FRACTION_DIGITS = 1;
const PLACEHOLDER = /\{(\w+)\}/g;

/** The first browser language the app speaks, English otherwise. */
export function pickLanguage(languages: readonly string[]): Language {
  for (const tag of languages) {
    const primary = tag.split("-")[0]?.toLowerCase();
    const supported = LANGUAGES.find((language) => language === primary);
    if (supported) {
      return supported;
    }
  }
  return FALLBACK_LANGUAGE;
}

export interface Translator {
  readonly language: Language;
  t<Key extends MessageKey>(key: Key, ...args: MessageArgs<Key>): string;
  /** `m:ss`, minutes unbounded. */
  formatDuration(seconds: number): string;
  /** Seconds with at most one decimal in the locale and the unit, e.g. "4,5 s". */
  formatSeconds(seconds: number): string;
  /** A date-time as dd.mm.yyyy (or the locale's order), read in UTC. */
  formatDate(isoDateTime: string): string;
}

export function createTranslator(language: Language): Translator {
  const catalogue = CATALOGUES[language];
  const locale = LOCALES[language];
  const plurals = new Intl.PluralRules(locale);
  const numbers = new Intl.NumberFormat(locale);
  const decimals = new Intl.NumberFormat(locale, {
    maximumFractionDigits: SECONDS_FRACTION_DIGITS,
  });
  const dates = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });

  function pick(key: MessageKey, message: Message, params: Readonly<Record<string, ParamValue>>) {
    if (typeof message === "string") {
      return message;
    }
    const count = params["count"];
    if (typeof count !== "number") {
      throw new Error(`message "${key}" is a plural and needs a numeric "count" parameter`);
    }
    return plurals.select(count) === "one" ? message.one : message.other;
  }

  function t<Key extends MessageKey>(key: Key, ...args: MessageArgs<Key>): string {
    const params: Readonly<Record<string, ParamValue>> = args[0] ?? {};
    return pick(key, catalogue[key], params).replace(PLACEHOLDER, (_, name: string) => {
      const value = params[name];
      if (value === undefined) {
        throw new Error(`message "${key}" needs the parameter "${name}"`);
      }
      return typeof value === "number" ? numbers.format(value) : value;
    });
  }

  return {
    language,
    t,
    formatDuration(seconds) {
      const whole = Math.floor(seconds);
      const minutes = Math.floor(whole / SECONDS_PER_MINUTE);
      const rest = String(whole % SECONDS_PER_MINUTE).padStart(2, "0");
      return `${minutes}:${rest}`;
    },
    formatSeconds(seconds) {
      return t("units.seconds", { seconds: decimals.format(seconds) });
    },
    formatDate(isoDateTime) {
      const date = new Date(isoDateTime);
      if (Number.isNaN(date.getTime())) {
        throw new RangeError(`cannot format "${isoDateTime}" as a date: expected ISO 8601`);
      }
      return dates.format(date);
    },
  };
}
