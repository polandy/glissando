import { nextSlideStart, previousSlideStart, type SlideBoundaries } from "./slide-boundaries";

export type PlayerAction = "toggle-play" | "previous" | "next" | "close" | "toggle-fullscreen";

type KeyPress = Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey">;

/** What a `PlayerAction` needs to run, gathered so the overlay's keyboard handler stays short. */
export interface PlayerActionContext {
  readonly boundaries: SlideBoundaries;
  readonly currentTime: number;
  togglePlay(): void;
  seek(seconds: number): void;
  close(): void;
  toggleFullscreen(): void;
}

export function performPlayerAction(action: PlayerAction, context: PlayerActionContext): void {
  switch (action) {
    case "toggle-play":
      return context.togglePlay();
    case "previous":
      return context.seek(previousSlideStart(context.boundaries, context.currentTime));
    case "next": {
      const start = nextSlideStart(context.boundaries, context.currentTime);
      return start === null ? undefined : context.seek(start);
    }
    case "close":
      return context.close();
    case "toggle-fullscreen":
      return context.toggleFullscreen();
  }
}

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
