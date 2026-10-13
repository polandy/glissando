import type { Scheduler } from "../ui-kit/scheduler";
import {
  openTvStream,
  TvGoneError,
  TvUnreachableError,
  type OpenEventSource,
  type TvApi,
  type TvEvent,
} from "../tv-remote/tv-api";
import {
  createTvController,
  type CommandNote,
  type PlayerChange,
  type PlayerControl,
  type TvController,
} from "../tv-remote/tv-controller";
import type { PlaybackState } from "../tv-remote/tv-protocol";

/** What a TV session talks through; the browser's in the page, fakes in tests. */
export interface TvPorts {
  readonly api: TvApi;
  readonly openEvents: OpenEventSource;
  readonly scheduler: Scheduler;
}

/** Every event of the TV's stream but a command, which the session applies itself. */
export type TvPageEvent = Exclude<TvEvent, { readonly type: "command" }>;

export interface TvSessionOptions {
  readonly tvKey: string;
  readonly note: (note: CommandNote) => void;
  readonly event: (event: TvPageEvent) => void;
}

/** One session of the TV page: its stream, the commands it applies and the reports it sends. */
export interface TvSession {
  /** The remote drives `control` from now on, a slideshow called `title`. */
  drive(control: PlayerControl, title: string): void;
  /** The driven player is gone; commands wait for the next one. */
  release(): void;
  /** The driven player changed; the hook its page player's `changed` goes to. */
  playerChanged(change: PlayerChange): void;
  /** Closes the stream; nothing is reported any more. */
  close(): void;
}

export function openTvSession(ports: TvPorts, options: TvSessionOptions): TvSession {
  const { tvKey } = options;
  let controller: TvController | null = null;
  const report = (state: PlaybackState) => {
    ports.api.report(tvKey, state).catch((error: unknown) => {
      // A session gone is told by the stream's `end`; a server away misses one report of many.
      if (error instanceof TvGoneError || error instanceof TvUnreachableError) return;
      console.error("the TV could not report its playback", error);
    });
  };
  const release = () => {
    controller?.stop();
    controller = null;
  };
  const closeStream = openTvStream(ports.openEvents, tvKey, {
    event(event) {
      if (event.type === "command") controller?.apply(event.command);
      else options.event(event);
    },
    fault: (error) => console.error("the TV stream sent what the page cannot read", error),
  });
  return {
    drive(control, title) {
      release();
      controller = createTvController({
        control,
        title,
        scheduler: ports.scheduler,
        report,
        note: options.note,
      });
      controller.report();
    },
    release,
    playerChanged: (change) => controller?.playerChanged(change),
    close() {
      release();
      closeStream();
    },
  };
}
