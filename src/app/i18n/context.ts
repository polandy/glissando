import { getContext } from "svelte";
import type { Translator } from "./translator";

const TRANSLATOR_CONTEXT = Symbol("translator");

/** Where the translator in effect is read; a reactive source re-renders copy when it changes. */
export interface TranslatorSource {
  readonly current: Translator;
}

/**
 * A translator that always speaks the current language: each call reads the source, so copy
 * rendered from it follows a language switch. Call during component initialisation.
 */
export function getTranslator(): Translator {
  const source = getContext<TranslatorSource | undefined>(TRANSLATOR_CONTEXT);
  if (source === undefined) {
    throw new Error("no translator in context: mount the root with translatorContext");
  }
  return {
    get language() {
      return source.current.language;
    },
    t: (key, ...args) => source.current.t(key, ...args),
    formatDuration: (seconds) => source.current.formatDuration(seconds),
    formatSeconds: (seconds) => source.current.formatSeconds(seconds),
    formatTenthSeconds: (seconds) => source.current.formatTenthSeconds(seconds),
    formatDate: (isoDateTime) => source.current.formatDate(isoDateTime),
    formatBytes: (bytes) => source.current.formatBytes(bytes),
    formatZoom: (zoom) => source.current.formatZoom(zoom),
    formatTenths: (seconds) => source.current.formatTenths(seconds),
  };
}

/** The context for `mount(App, { context })`, for a root mounted outside a component. */
export function translatorContext(source: TranslatorSource): Map<symbol, TranslatorSource> {
  return new Map([[TRANSLATOR_CONTEXT, source]]);
}
