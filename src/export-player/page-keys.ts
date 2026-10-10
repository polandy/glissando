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
