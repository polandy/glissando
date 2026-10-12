import type { Language } from "../i18n/translator";
import { resolveLanguage, type LanguagePreference, type LanguagePreferenceStore } from "./language";
import type { PlaybackQualityPreference, PlaybackQualityStore } from "./playback-quality";
import type { ThemePreference, ThemePreferenceStore } from "./theme";

export interface SettingsState {
  readonly theme: ThemePreference;
  readonly language: LanguagePreference;
  /** The quality server slideshows play in on this device. */
  readonly playbackQuality: PlaybackQualityPreference;
  /** What "auto" picks, for its hint. */
  readonly browserLanguage: Language;
  /** The language the UI speaks. */
  readonly effectiveLanguage: Language;
}

type StoredPreferences = Pick<SettingsState, "theme" | "language" | "playbackQuality">;

/** The device's preferences: each choice is stored at once and announced to the subscribers. */
export class AppSettings {
  readonly #themes: ThemePreferenceStore;
  readonly #languages: LanguagePreferenceStore;
  readonly #playbackQualities: PlaybackQualityStore;
  readonly #browserLanguages: readonly string[];
  readonly #listeners = new Set<(state: SettingsState) => void>();
  #state: SettingsState;

  constructor(options: {
    readonly themes: ThemePreferenceStore;
    readonly languages: LanguagePreferenceStore;
    readonly playbackQualities: PlaybackQualityStore;
    readonly browserLanguages: readonly string[];
  }) {
    this.#themes = options.themes;
    this.#languages = options.languages;
    this.#playbackQualities = options.playbackQualities;
    this.#browserLanguages = options.browserLanguages;
    this.#state = this.#stateFor({
      theme: this.#themes.read(),
      language: this.#languages.read(),
      playbackQuality: this.#playbackQualities.read(),
    });
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
    this.#set(this.#stateFor({ ...this.#state, theme }));
  }

  setLanguage(language: LanguagePreference): void {
    this.#languages.write(language);
    this.#set(this.#stateFor({ ...this.#state, language }));
  }

  setPlaybackQuality(playbackQuality: PlaybackQualityPreference): void {
    this.#playbackQualities.write(playbackQuality);
    this.#set(this.#stateFor({ ...this.#state, playbackQuality }));
  }

  #stateFor({ theme, language, playbackQuality }: StoredPreferences): SettingsState {
    return {
      theme,
      language,
      playbackQuality,
      browserLanguage: resolveLanguage("auto", this.#browserLanguages),
      effectiveLanguage: resolveLanguage(language, this.#browserLanguages),
    };
  }

  #set(state: SettingsState): void {
    if (
      state.theme === this.#state.theme &&
      state.language === this.#state.language &&
      state.playbackQuality === this.#state.playbackQuality
    ) {
      return;
    }
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}
