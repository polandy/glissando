import type { Translator } from "./translator";

/** The translator in effect; replacing it re-renders every component's copy at once. */
export class TranslatorState {
  current: Translator;

  constructor(initial: Translator) {
    this.current = $state.raw(initial);
  }
}
