import { pickLanguage, type Language } from "../i18n/translator";
import type { KeyValueStorage } from "../start/first-launch";
import { createStoredChoice, type StoredChoice } from "./stored-choice";

/** "auto" speaks the first browser language the app knows; the others pin a language. */
export const LANGUAGE_PREFERENCES = ["auto", "de", "en"] as const;
export type LanguagePreference = (typeof LANGUAGE_PREFERENCES)[number];

export const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = "auto";

export type LanguagePreferenceStore = StoredChoice<LanguagePreference>;

const LANGUAGE_KEY = "glissando.language";

export function createStorageLanguagePreferenceStore(
  storage: KeyValueStorage,
): LanguagePreferenceStore {
  return createStoredChoice(
    storage,
    LANGUAGE_KEY,
    LANGUAGE_PREFERENCES,
    DEFAULT_LANGUAGE_PREFERENCE,
  );
}

/** The language the UI speaks under `preference`. */
export function resolveLanguage(
  preference: LanguagePreference,
  browserLanguages: readonly string[],
): Language {
  return preference === "auto" ? pickLanguage(browserLanguages) : preference;
}
