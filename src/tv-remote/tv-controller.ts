import type { Scheduler } from "../ui-kit/scheduler";
import type { Command, PlaybackState } from "./tv-protocol";

/**
 * Applies the remote's commands to the TV's player and reports its playback
 * (dev-docs/tv_remote/TV_PAGE.md, Commands and Reports). No DOM: the player is a port.
 */

/** Less than this far into a picture, `previous` goes to the picture before. */
export const PREVIOUS_RESTARTS_WITHIN_SECONDS = 2;
/** How often the TV reports while it plays, so the remote's clock never drifts far. */
export const REPORT_EVERY_MS = 5000;

/** The TV page's player as the controller drives it. */
export interface PlayerControl {
  readonly paused: boolean;
  readonly ended: boolean;
  readonly currentTime: number;
  readonly duration: number;
  /** Where each picture starts, in seconds from the start, in order. */
  readonly pictureStarts: readonly number[];
  /** The music's master volume, 0 to 1. */
  volume: number;
  /** The browser refused to start the music, since the last attempt to play. */
  readonly playRefused: boolean;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
}

/** What the TV shows for a moment after a command. */
export type CommandNote =
  | { readonly kind: "playing" | "paused" | "next" | "previous" }
  | { readonly kind: "volume"; readonly percent: number };

/** What the player tells the controller; `time` covers every frame and seek. */
export type PlayerChange = "playing" | "pause" | "ended" | "time" | "refused";

export interface TvControllerOptions {
  readonly control: PlayerControl;
  /** The slideshow's title, as the remote shows it. */
  readonly title: string;
  readonly scheduler: Scheduler;
  readonly report: (state: PlaybackState) => void;
  readonly note: (note: CommandNote) => void;
}

export interface TvController {
  apply(command: Command): void;
  playerChanged(change: PlayerChange): void;
  /** Reports the playback now, e.g. for a session that has just begun. */
  report(): void;
  /** No more reports, for a player that is gone. */
  stop(): void;
}

const PERCENT = 100;

export function createTvController(options: TvControllerOptions): TvController {
  const { control, scheduler } = options;
  let stopped = false;
  let cancelNextReport: (() => void) | null = null;
  let reportedPicture: number | null = null;

  const report = () => {
    if (stopped) return;
    cancelNextReport?.();
    cancelNextReport = null;
    const state = playbackState(control, options.title);
    reportedPicture = state.pictureIndex;
    options.report(state);
    if (state.playing) cancelNextReport = scheduler.after(REPORT_EVERY_MS, report);
  };
  const seek = (seconds: number) => control.seek(Math.min(control.duration, seconds));

  const perform = (command: Command): CommandNote | null => {
    const starts = control.pictureStarts;
    const index = pictureIndexAt(starts, control.currentTime);
    switch (command.type) {
      case "play":
        control.play();
        return { kind: "playing" };
      case "pause":
        control.pause();
        return { kind: "paused" };
      case "restart":
        control.seek(0);
        control.play();
        return { kind: "playing" };
      case "next":
        seek(starts[index + 1] ?? control.duration);
        return { kind: "next" };
      case "previous": {
        const start = starts[index] ?? 0;
        const justStarted = control.currentTime - start < PREVIOUS_RESTARTS_WITHIN_SECONDS;
        seek(justStarted ? (starts[index - 1] ?? start) : start);
        return { kind: "previous" };
      }
      case "seek":
        seek(command.value);
        return null;
      case "volume":
        control.volume = command.value;
        return { kind: "volume", percent: Math.round(command.value * PERCENT) };
      case "disconnect":
        // The server ends the session for it; the stream's `end` brings the page back.
        return null;
    }
  };

  return {
    apply(command) {
      if (stopped) return;
      const note = perform(command);
      if (note !== null) options.note(note);
      report();
    },
    playerChanged(change) {
      if (change !== "time") return report();
      const picture = pictureIndexAt(control.pictureStarts, control.currentTime);
      if (picture !== reportedPicture) report();
    },
    report,
    stop() {
      stopped = true;
      cancelNextReport?.();
      cancelNextReport = null;
    },
  };
}

/** The player's playback as the TV reports it. */
function playbackState(control: PlayerControl, title: string): PlaybackState {
  const duration = Math.max(0, control.duration);
  const position = Math.min(duration, Math.max(0, control.currentTime));
  return {
    playing: !control.paused,
    ended: control.ended,
    needsTvOk: control.playRefused,
    positionSeconds: position,
    durationSeconds: duration,
    pictureIndex: pictureIndexAt(control.pictureStarts, position),
    pictureCount: control.pictureStarts.length,
    volume: control.volume,
    title,
  };
}

/** The picture on screen at `seconds`: the last one started by then. */
function pictureIndexAt(starts: readonly number[], seconds: number): number {
  const next = starts.findIndex((start) => start > seconds);
  return Math.max(0, (next === -1 ? starts.length : next) - 1);
}
