import { createTranslator } from "../i18n/translator";
import { TranslatorState } from "../i18n/translator-state.svelte";
import { AppSettings } from "./app-settings";
import { createStorageLanguagePreferenceStore } from "./language";
import { createStoragePlaybackQualityStore } from "./playback-quality";
import { applyThemePreference, createStorageThemePreferenceStore } from "./theme";

/**
 * The device's settings and the translator that follows their language. The theme and the
 * language apply to `root` now, so a pinned choice is in place for the first paint, and again on
 * every later choice in the settings sheet.
 */
export function bootstrapSettings(
  window: Window,
  root: HTMLElement,
): { readonly settings: AppSettings; readonly translator: TranslatorState } {
  const settings = new AppSettings({
    themes: createStorageThemePreferenceStore(window.localStorage),
    playbackQualities: createStoragePlaybackQualityStore(window.localStorage),
    languages: createStorageLanguagePreferenceStore(window.localStorage),
    browserLanguages: window.navigator.languages,
  });
  const translator = new TranslatorState(createTranslator(settings.state.effectiveLanguage));
  settings.subscribe(({ theme, effectiveLanguage }) => {
    applyThemePreference(root, theme);
    root.lang = effectiveLanguage;
    if (translator.current.language !== effectiveLanguage) {
      translator.current = createTranslator(effectiveLanguage);
    }
  });
  return { settings, translator };
}
