import { translatorContext, type TranslatorSource } from "./i18n/context";
import { navigatorContext, type NavigatorSource } from "./navigation/context";

/** The context the root is mounted with: what components read through `getTranslator` and `getNavigator`. */
export function appContext(
  translator: TranslatorSource,
  navigator: NavigatorSource,
): Map<symbol, unknown> {
  return new Map([...translatorContext(translator), ...navigatorContext(navigator)]);
}
