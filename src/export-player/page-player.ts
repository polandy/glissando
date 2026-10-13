// The player wiring the exported page and the share page have in common: the controls, keys,
// cards and the player behind them. Each page brings its data (`PlayablePage`) and its own
// reactions (`PagePlayerHooks`); see dev-docs/html_export/CODE.md.
import { captionInset, captionInsetMotion } from "../ui-kit/caption-inset";
import { ControlsVisibility } from "../ui-kit/controls-visibility";
import { toggleFullscreen } from "../ui-kit/fullscreen";
import { REDUCED_MOTION_QUERY } from "../ui-kit/reduced-motion";
import { browserScheduler } from "../ui-kit/scheduler";
import { createBrowserPlayer, type BrowserPlayer } from "../player/browser-player";
import DecodeWorker from "../player/browser/picture-decode-worker.ts?worker&inline";
import type { OpenPicture } from "../player/browser/picture-loader";
import { SlideshowLoadError } from "../player/picture-buffer";
import { MusicPlaybackError } from "../player/ports";
import type { Slideshow } from "../player/slideshow";
import type { MutableMusicOutput } from "./mutable-music-output";
import { pageKeyAction, timelineKeyAction, type PageAction } from "./page-keys";
import { startsOf, wireTimeline } from "./page-timeline";
import type { PageView } from "./page-view";
import { SEEK_STEP_SECONDS, seekBy } from "./seek";

/** What the page plays: the slideshow, its tracks' `src` playable URLs, and its pictures. */
export interface PlayablePage {
  readonly slideshow: Slideshow;
  readonly openPicture: OpenPicture;
}

export interface PagePlayerHooks {
  /**
   * Play on the start or end card, once the gesture has unlocked the music; `play` starts the
   * player shown by then. Without it, the player plays at once.
   */
  readonly start?: (play: () => void) => void;
  /** A picture that failed to load, at the player's time; true when the page took care of it. */
  readonly pictureFailed?: (cause: unknown, atSeconds: number) => boolean;
  /** The player waits for a picture it hasn't prepared yet, or has stopped waiting. */
  readonly waiting?: (waiting: boolean) => void;
  /** The playback changed, for a page that reports it (the TV page). */
  readonly changed?: (change: PageChange) => void;
}

/** `time` covers every frame and seek; `refused` is the browser refusing to start the music. */
export type PageChange = "playing" | "pause" | "ended" | "time" | "refused";

/**
 * Plays the page's slideshow. Beyond `show`, the TV page drives it with the rest
 * (dev-docs/tv_remote/TV_PAGE.md); those throw before the first `show`.
 */
export interface PagePlayer {
  /** Plays `page` from now on: from `atSeconds` (0), at once when `play`, else paused. */
  show(page: PlayablePage, from?: { readonly atSeconds: number; readonly play: boolean }): void;
  readonly paused: boolean;
  readonly ended: boolean;
  readonly currentTime: number;
  readonly duration: number;
  /** Where each picture of the shown slideshow starts, in seconds. */
  readonly pictureStarts: readonly number[];
  /** The music's master volume, 0 to 1. */
  volume: number;
  /** The browser refused to start the music, since the last attempt to play. */
  readonly playRefused: boolean;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  /** Stops the player and the page's listeners for good; the view stays the caller's. */
  dispose(): void;
}

const PLAYING_EVENTS = ["play", "pause", "playing", "ended"] as const;
const TIME_EVENTS = ["timeupdate", "seeked", "canplay"] as const;
const STOPPED_WAITING_EVENTS = ["playing", "pause", "ended", "error"] as const;

/** Wires `view` to a player, which `show` creates and replaces. */
export function createPagePlayer(
  view: PageView,
  music: MutableMusicOutput,
  hooks: PagePlayerHooks = {},
): PagePlayer {
  let shown: { readonly player: BrowserPlayer; readonly detach: AbortController } | null = null;
  let pictureStarts: readonly number[] = [];
  let playRefused = false;
  const pageListeners = new AbortController();
  const listening = { signal: pageListeners.signal };
  const player = (): BrowserPlayer => {
    if (shown === null) throw new Error("the page has no player yet; show a slideshow first");
    return shown.player;
  };

  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  let insetPlaced = false;
  const placeCaptions = (visible: boolean) => {
    if (shown === null) return;
    const barHeight = window.innerHeight - view.controls.getBoundingClientRect().top;
    const inset = captionInset(
      visible && !view.controls.hidden,
      { height: barHeight, fadeHeight: 0 },
      0,
    );
    const motion = captionInsetMotion({
      firstPlacement: !insetPlaced,
      reducedMotion: reducedMotion.matches,
    });
    if (motion === "jump") player().jumpCaptionInset(inset);
    else player().captionInset = inset;
    insetPlaced = true;
  };
  const controls = new ControlsVisibility(browserScheduler, (visible) => {
    view.showControls(visible);
    placeCaptions(visible);
  });
  const showTime = () => view.showTime(player().currentTime, player().duration);
  const seek = (seconds: number) => {
    player().currentTime = seconds;
    showTime();
  };
  const play = () => {
    // Within the gesture, also when the music starts only once the pictures are loaded.
    music.unlock();
    player().play();
  };
  const start = () => {
    music.unlock();
    if (hooks.start === undefined) player().play();
    else hooks.start(() => player().play());
  };

  const perform = (action: PageAction) => {
    switch (action) {
      case "toggle-play":
        return player().paused ? play() : player().pause();
      case "seek-back":
        return seek(seekBy(player().currentTime, -SEEK_STEP_SECONDS, player().duration));
      case "seek-forward":
        return seek(seekBy(player().currentTime, SEEK_STEP_SECONDS, player().duration));
      case "toggle-mute":
        music.muted = !music.muted;
        return view.showMuted(music.muted);
      case "toggle-fullscreen":
        return toggleFullscreen(document.documentElement);
    }
  };

  const attach = (shownPlayer: BrowserPlayer, signal: AbortSignal) => {
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
      playRefused = false;
    });
    const changed = hooks.changed;
    if (changed !== undefined) {
      on("playing", () => changed("playing"));
      // The end pauses the player too; `ended` tells it once.
      on("pause", () => shownPlayer.ended || changed("pause"));
      on("ended", () => changed("ended"));
      on("timeupdate", () => changed("time"));
    }
    if (hooks.waiting !== undefined) {
      const waiting = hooks.waiting;
      on("waiting", () => waiting(true));
      for (const event of STOPPED_WAITING_EVENTS) on(event, () => waiting(false));
    }
    on("error", () => {
      const error = shownPlayer.error;
      // A refused music start is no failure: the player pauses, and Play retries with a gesture.
      if (error instanceof MusicPlaybackError) {
        playRefused = true;
        hooks.changed?.("refused");
        return;
      }
      if (
        error instanceof SlideshowLoadError &&
        hooks.pictureFailed?.(error.cause, shownPlayer.currentTime) === true
      ) {
        return;
      }
      console.error("the slideshow cannot play", error);
      view.showState("error");
      view.showError(error?.name ?? "Error");
    });
  };

  view.bigPlay.addEventListener("click", start);
  view.playAgain.addEventListener("click", start);
  view.togglePlay.addEventListener("click", () => perform("toggle-play"));
  view.toggleMute?.addEventListener("click", () => perform("toggle-mute"));
  view.fullScreen?.addEventListener("click", () => perform("toggle-fullscreen"));
  view.stage.addEventListener("click", () => controls.toggle());
  wireTimeline(view.track, player, seek);
  const keyContext = {
    get state() {
      return view.state;
    },
    withMusic: view.toggleMute !== null,
    withFullScreen: view.fullScreen !== null,
  };
  view.track.addEventListener("keydown", (event) => {
    const action = timelineKeyAction(event);
    if (action === null) return;
    // The slider handles its own arrows; the page's shortcut must not seek a second time.
    event.preventDefault();
    event.stopPropagation();
    controls.reveal();
    perform(action);
  });
  document.addEventListener("pointermove", () => controls.reveal(), listening);
  document.addEventListener(
    "keydown",
    (event) => {
      const action = pageKeyAction(event, keyContext);
      if (action === null) return;
      event.preventDefault();
      controls.reveal();
      perform(action);
    },
    listening,
  );
  window.addEventListener("resize", () => placeCaptions(controls.visible), listening);
  view.showMuted(music.muted);

  const takeDown = () => {
    if (shown === null) return;
    shown.detach.abort();
    shown.player.destroy();
    shown = null;
  };

  return {
    show(page, from = { atSeconds: 0, play: false }) {
      takeDown();
      pictureStarts = startsOf(page.slideshow);
      const created = createBrowserPlayer(view.stage, page.slideshow, {
        startDecodeWorker: () => new DecodeWorker(),
        mainThreadDecodeFallback: true,
        openPicture: page.openPicture,
        musicOutput: music,
      });
      const detach = new AbortController();
      shown = { player: created, detach };
      attach(created, detach.signal);
      insetPlaced = false;
      if (from.atSeconds > 0) created.currentTime = from.atSeconds;
      showTime();
      if (from.play) created.play();
    },
    get paused() {
      return player().paused;
    },
    get ended() {
      return player().ended;
    },
    get currentTime() {
      return player().currentTime;
    },
    get duration() {
      return player().duration;
    },
    get pictureStarts() {
      return pictureStarts;
    },
    get volume() {
      return music.volume;
    },
    set volume(volume) {
      music.volume = volume;
    },
    get playRefused() {
      return playRefused;
    },
    play,
    pause: () => player().pause(),
    seek,
    dispose() {
      pageListeners.abort();
      takeDown();
    },
  };
}
