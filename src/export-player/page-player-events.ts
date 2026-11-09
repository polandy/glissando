import type { BrowserPlayer } from "../player/browser-player";
import { SlideshowLoadError } from "../player/picture-buffer";
import { MusicPlaybackError } from "../player/ports";
import type { ControlsVisibility } from "../ui-kit/controls-visibility";
import type { PagePlayerHooks } from "./page-player";
import type { PageView } from "./page-view";

const PLAYING_EVENTS = ["play", "pause", "playing", "ended"] as const;
const TIME_EVENTS = ["timeupdate", "seeked", "canplay"] as const;
const STOPPED_WAITING_EVENTS = ["playing", "pause", "ended", "error"] as const;

interface PlayerEventDeps {
  readonly view: PageView;
  readonly controls: ControlsVisibility;
  readonly hooks: PagePlayerHooks;
  readonly placeCaptions: (visible: boolean) => void;
  readonly showTime: () => void;
  readonly setPlayRefused: (refused: boolean) => void;
}

/** Shows what `shownPlayer` does on the page and tells the hooks, until `signal` aborts. */
export function attachPlayerEvents(
  shownPlayer: BrowserPlayer,
  signal: AbortSignal,
  deps: PlayerEventDeps,
): void {
  const { view, controls, showTime, placeCaptions } = deps;
  const on = (event: string, listener: () => void) =>
    shownPlayer.addEventListener(event, listener, { signal });
  on("playing", () => view.showState("playing"));
  on("pause", () => {
    if (!shownPlayer.ended) view.showState("paused");
  });
  on("ended", () => view.showState("ended"));
  for (const event of PLAYING_EVENTS) {
    on(event, () => {
      view.showPaused(shownPlayer.paused);
      controls.setPlaying(!shownPlayer.paused);
      placeCaptions(controls.visible);
    });
  }
  for (const event of TIME_EVENTS) on(event, showTime);
  on("play", () => {
    deps.setPlayRefused(false);
  });
  const changed = deps.hooks.changed;
  if (changed !== undefined) {
    on("playing", () => changed("playing"));
    // The end pauses the player too; `ended` tells it once.
    on("pause", () => shownPlayer.ended || changed("pause"));
    on("ended", () => changed("ended"));
    on("timeupdate", () => changed("time"));
  }
  if (deps.hooks.waiting !== undefined) {
    const waiting = deps.hooks.waiting;
    on("waiting", () => waiting(true));
    for (const event of STOPPED_WAITING_EVENTS) on(event, () => waiting(false));
  }
  on("error", () => {
    const error = shownPlayer.error;
    // A refused music start is no failure: the player pauses, and Play retries with a gesture.
    if (error instanceof MusicPlaybackError) {
      deps.setPlayRefused(true);
      deps.hooks.changed?.("refused");
      return;
    }
    if (
      error instanceof SlideshowLoadError &&
      deps.hooks.pictureFailed?.(error.cause, shownPlayer.currentTime) === true
    ) {
      return;
    }
    console.error("the slideshow cannot play", error);
    view.showState("error");
    view.showError(error?.name ?? "Error");
  });
}
