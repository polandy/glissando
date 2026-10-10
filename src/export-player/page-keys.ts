import type { PageState } from "../html-export/page-contract";

export type PageAction =
  "toggle-play" | "seek-back" | "seek-forward" | "toggle-mute" | "toggle-fullscreen";

type KeyPress = Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey">;

/** As on common video sites: Space or K, the arrows, M and F. */
const ACTIONS_BY_KEY: Readonly<Record<string, PageAction>> = {
  " ": "toggle-play",
  k: "toggle-play",
  K: "toggle-play",
  ArrowLeft: "seek-back",
  ArrowRight: "seek-forward",
  m: "toggle-mute",
  M: "toggle-mute",
  f: "toggle-fullscreen",
  F: "toggle-fullscreen",
};

/** The page's keyboard shortcuts; a key with a modifier stays the browser's. */
export function pageActionForKey(press: KeyPress): PageAction | null {
  if (press.altKey || press.ctrlKey || press.metaKey) {
    return null;
  }
  return ACTIONS_BY_KEY[press.key] ?? null;
}

/** What decides whether a shortcut acts. */
export interface PageKeyContext {
  readonly state: PageState;
  readonly withMusic: boolean;
  readonly withFullScreen: boolean;
}

/**
 * The action a key press performs on the page: none while the start, end or error card shows,
 * none for M without music, none for F without element full screen.
 */
export function pageKeyAction(press: KeyPress, page: PageKeyContext): PageAction | null {
  if (page.state !== "playing" && page.state !== "paused") return null;
  const action = pageActionForKey(press);
  if (action === "toggle-mute" && !page.withMusic) return null;
  if (action === "toggle-fullscreen" && !page.withFullScreen) return null;
  return action;
}

/** The focused timeline slider's own keys: the page's seek arrows. */
export function timelineKeyAction(press: KeyPress): "seek-back" | "seek-forward" | null {
  const action = pageActionForKey(press);
  return action === "seek-back" || action === "seek-forward" ? action : null;
}
