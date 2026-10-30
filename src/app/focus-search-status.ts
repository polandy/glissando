import { getContext, setContext } from "svelte";
import type { RunningSearch } from "../library/running-search";

const FOCUS_SEARCH_STATUS_CONTEXT = Symbol("focus-search-status");

/** Where the header reads the background faces-and-subjects search; a reactive source re-renders it. */
export interface FocusSearchStatusSource {
  readonly current: RunningSearch | null;
}

/** Call during the root component's initialisation. */
export function setFocusSearchStatus(source: FocusSearchStatusSource): void {
  setContext(FOCUS_SEARCH_STATUS_CONTEXT, source);
}

/** Undefined where no root set one, e.g. a component mounted on its own in a test. */
export function getFocusSearchStatus(): FocusSearchStatusSource | undefined {
  return getContext<FocusSearchStatusSource | undefined>(FOCUS_SEARCH_STATUS_CONTEXT);
}
