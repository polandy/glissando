import { getContext, setContext } from "svelte";
import type { Translator } from "./translator";

const TRANSLATOR_CONTEXT = Symbol("translator");

/** Makes `translator` available to every component below the caller (the composition root). */
export function provideTranslator(translator: Translator): void {
  setContext(TRANSLATOR_CONTEXT, translator);
}

/** The translator a parent provided; call during component initialisation. */
export function getTranslator(): Translator {
  const translator = getContext<Translator | undefined>(TRANSLATOR_CONTEXT);
  if (translator === undefined) {
    throw new Error("no translator in context: call provideTranslator in a parent component");
  }
  return translator;
}

/** The context for `mount(App, { context })`, for a root mounted outside a component. */
export function translatorContext(translator: Translator): Map<symbol, Translator> {
  return new Map([[TRANSLATOR_CONTEXT, translator]]);
}
