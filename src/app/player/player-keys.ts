export type PlayerAction = "toggle-play" | "previous" | "next" | "close" | "toggle-fullscreen";

type KeyPress = Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey">;

const ACTIONS_BY_KEY: Readonly<Record<string, PlayerAction>> = {
  " ": "toggle-play",
  ArrowLeft: "previous",
  ArrowRight: "next",
  Escape: "close",
  f: "toggle-fullscreen",
  F: "toggle-fullscreen",
};

/** The player's keyboard shortcuts; a key with a modifier stays the browser's. */
export function playerActionForKey(press: KeyPress): PlayerAction | null {
  if (press.altKey || press.ctrlKey || press.metaKey) {
    return null;
  }
  return ACTIONS_BY_KEY[press.key] ?? null;
}
