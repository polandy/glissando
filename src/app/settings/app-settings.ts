import type { Language } from "../i18n/translator";
import { resolveLanguage, type LanguagePreference, type LanguagePreferenceStore } from "./language";
import type { ThemePreference, ThemePreferenceStore } from "./theme";

export interface SettingsState {
  readonly theme: ThemePreference;
  readonly language: LanguagePreference;
  /** What "auto" picks, for its hint. */
  readonly browserLanguage: Language;
  /** The language the UI speaks. */
  readonly effectiveLanguage: Language;
}

/** The device's preferences: each choice is stored at once and announced to the subscribers. */
export class AppSettings {
  readonly #themes: ThemePreferenceStore;
  readonly #languages: LanguagePreferenceStore;
  readonly #browserLanguages: readonly string[];
  readonly #listeners = new Set<(state: SettingsState) => void>();
  #state: SettingsState;

  constructor(options: {
    readonly themes: ThemePreferenceStore;
    readonly languages: LanguagePreferenceStore;
    readonly browserLanguages: readonly string[];
  }) {
    this.#themes = options.themes;
    this.#languages = options.languages;
    this.#browserLanguages = options.browserLanguages;
    this.#state = this.#stateFor(this.#themes.read(), this.#languages.read());
  }

  get state(): SettingsState {
    return this.#state;
  }

  /** Called with the current state at once, then with every change; returns the unsubscribe. */
  subscribe(listener: (state: SettingsState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  setTheme(theme: ThemePreference): void {
    this.#themes.write(theme);
    this.#set(this.#stateFor(theme, this.#state.language));
  }

  setLanguage(language: LanguagePreference): void {
    this.#languages.write(language);
    this.#set(this.#stateFor(this.#state.theme, language));
  }

  #stateFor(theme: ThemePreference, language: LanguagePreference): SettingsState {
    return {
      theme,
      language,
      browserLanguage: resolveLanguage("auto", this.#browserLanguages),
      effectiveLanguage: resolveLanguage(language, this.#browserLanguages),
    };
  }

  #set(state: SettingsState): void {
    if (state.theme === this.#state.theme && state.language === this.#state.language) {
      return;
    }
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}
