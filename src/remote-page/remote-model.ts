import { MILLISECONDS_PER_SECOND } from "../player/slideshow";
import type { Command, PlaybackState } from "../tv-remote/tv-protocol";

/**
 * The remote page's state, pure (dev-docs/tv_remote/REMOTE_PAGE.md): what the remote stream
 * and the answers to its commands said, and what the page shows of it at a given time.
 */

export type Connection = "connecting" | "open" | "reconnecting";

/** What the remote stream tells (dev-docs/tv_remote/HTTP_API.md, Streams), and its loss. */
export type RemoteStreamEvent =
  | { readonly type: "snapshot"; readonly tvPresent: boolean; readonly state: PlaybackState | null }
  | { readonly type: "state"; readonly state: PlaybackState }
  | { readonly type: "tv"; readonly present: boolean }
  | { readonly type: "end" }
  | { readonly type: "lost" };

/** Why a command was not carried out: no TV stream (409), no session (404), anything else. */
export type CommandFailure = "tvAway" | "ended" | "failed";

export type RemoteEvent =
  | RemoteStreamEvent
  | { readonly type: "commandSent" }
  | {
      readonly type: "commandFailed";
      readonly command: Command;
      readonly reason: CommandFailure;
    };

export interface RemoteModel {
  readonly connection: Connection;
  readonly ended: boolean;
  readonly tvPresent: boolean;
  /** As the TV last reported it; null until it shows a slideshow. */
  readonly playback: PlaybackState | null;
  /** The clock's time of that report, which the position runs on from. */
  readonly reportedAtMs: number;
  /** Shown with "Try again" until a command arrives. */
  readonly failedCommand: Command | null;
}

export const INITIAL_REMOTE_MODEL: RemoteModel = {
  connection: "connecting",
  ended: false,
  tvPresent: false,
  playback: null,
  reportedAtMs: 0,
  failedCommand: null,
};

export function remoteModelAfter(
  model: RemoteModel,
  event: RemoteEvent,
  nowMs: number,
): RemoteModel {
  if (model.ended) return model;
  switch (event.type) {
    case "snapshot":
      return {
        ...model,
        connection: "open",
        tvPresent: event.tvPresent,
        playback: event.state,
        reportedAtMs: nowMs,
      };
    case "state":
      return { ...model, playback: event.state, reportedAtMs: nowMs };
    case "tv":
      return { ...model, tvPresent: event.present };
    case "end":
      return { ...model, ended: true };
    case "lost":
      // The position stops where it was; the snapshot after the reconnect corrects it.
      return {
        ...model,
        connection: "reconnecting",
        playback:
          model.playback === null
            ? null
            : { ...model.playback, positionSeconds: positionAt(model, nowMs) },
        reportedAtMs: nowMs,
      };
    case "commandSent":
      return { ...model, failedCommand: null };
    case "commandFailed":
      if (event.reason === "tvAway") return { ...model, tvPresent: false };
      if (event.reason === "ended") return { ...model, ended: true };
      return { ...model, failedCommand: event.command };
  }
}

export type Pill = "connecting" | "reconnecting" | "tvAway" | "showing";
export type Playback = "playing" | "paused" | "finished";

/** The slideshow's card, scrubber and volume. */
export interface ShowOnScreen {
  readonly title: string;
  /** Counted from 1. */
  readonly pictureNumber: number;
  readonly pictureCount: number;
  readonly playback: Playback;
  readonly positionSeconds: number;
  readonly durationSeconds: number;
  /** 0 to 1. */
  readonly volume: number;
}

export interface RemoteScreen {
  /** The "This remote has ended" card instead of the controls. */
  readonly ended: boolean;
  readonly pill: Pill;
  readonly controlsEnabled: boolean;
  readonly tvAwayNote: boolean;
  readonly needsTvOkNote: boolean;
  /** Null until the TV shows a slideshow. */
  readonly show: ShowOnScreen | null;
  readonly failedCommand: Command | null;
}

export function remoteScreen(model: RemoteModel, nowMs: number): RemoteScreen {
  const open = model.connection === "open";
  const { playback } = model;
  return {
    ended: model.ended,
    pill: pillOf(model),
    controlsEnabled: !model.ended && open && model.tvPresent && playback !== null,
    tvAwayNote: open && !model.tvPresent,
    needsTvOkNote: model.tvPresent && playback?.needsTvOk === true,
    show:
      playback === null
        ? null
        : {
            title: playback.title,
            pictureNumber: playback.pictureIndex + 1,
            pictureCount: playback.pictureCount,
            playback: playback.ended ? "finished" : playback.playing ? "playing" : "paused",
            positionSeconds: open ? positionAt(model, nowMs) : playback.positionSeconds,
            durationSeconds: playback.durationSeconds,
            volume: playback.volume,
          },
    failedCommand: model.failedCommand,
  };
}

function pillOf(model: RemoteModel): Pill {
  if (model.connection !== "open") return model.connection;
  return model.tvPresent ? "showing" : "tvAway";
}

/** The reported position, run on by the clock while the TV plays. */
function positionAt(model: RemoteModel, nowMs: number): number {
  const { playback } = model;
  if (playback === null) return 0;
  if (!playback.playing || playback.ended) return playback.positionSeconds;
  const elapsedSeconds = Math.max(0, nowMs - model.reportedAtMs) / MILLISECONDS_PER_SECOND;
  return Math.min(playback.durationSeconds, playback.positionSeconds + elapsedSeconds);
}
