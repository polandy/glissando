import {
  MILLISECONDS_PER_SECOND,
  musicGainAt,
  type Clock,
  type FrameScheduler,
  type MusicEnvelope,
  type MusicPlayback,
} from "../../player";

/** "Listen to the start" or "listen to the end" of the excerpt. */
export type ListenKind = "start" | "end";

/** How much of the excerpt each listen plays. */
export const LISTEN_PREVIEW_MS = 8 * MILLISECONDS_PER_SECOND;

/** What plays: track times in ms. */
export interface ListenRange {
  readonly fromMs: number;
  readonly toMs: number;
}

/** A listen under way; `positionMs` is where the playhead is in the track. */
export interface ListenState {
  readonly kind: ListenKind;
  readonly positionMs: number;
}

/** The music must reach the end of the envelope it was resolved to. */
export type ListenTiming = MusicEnvelope & { readonly endMs: number };

export interface ListenPorts {
  readonly clock: Clock;
  readonly frames: FrameScheduler;
  readonly music: MusicPlayback;
  readonly onError: (error: unknown) => void;
}

/** The start's first seconds with the fade-in, or the last before the audible end. */
export function listenRange(kind: ListenKind, timing: ListenTiming): ListenRange {
  return kind === "start"
    ? { fromMs: timing.startMs, toMs: Math.min(timing.endMs, timing.startMs + LISTEN_PREVIEW_MS) }
    : { fromMs: Math.max(timing.startMs, timing.endMs - LISTEN_PREVIEW_MS), toMs: timing.endMs };
}

/**
 * Plays a listen through the music port at the envelope's volume, as the player will, with a
 * playhead from the injected clock. One listen at a time; it stops by itself at its end.
 */
export class ListenPreview {
  readonly #ports: ListenPorts;
  readonly #onChange: (state: ListenState | null) => void;
  #playing: {
    readonly kind: ListenKind;
    readonly range: ListenRange;
    readonly timing: ListenTiming;
    readonly startedAtMs: number;
  } | null = null;
  #frame: number | null = null;
  #started: Promise<void> = Promise.resolve();

  constructor(ports: ListenPorts, onChange: (state: ListenState | null) => void) {
    this.#ports = ports;
    this.#onChange = onChange;
  }

  /** Starts the listen, or stops it when it is the one playing. */
  toggle(kind: ListenKind, timing: ListenTiming): void {
    const wasPlaying = this.#playing?.kind;
    this.stop();
    if (wasPlaying !== kind) {
      this.#start(kind, timing);
    }
  }

  stop(): void {
    if (this.#playing === null) {
      return;
    }
    this.#playing = null;
    if (this.#frame !== null) {
      this.#ports.frames.cancel(this.#frame);
      this.#frame = null;
    }
    this.#ports.music.pause();
    this.#onChange(null);
  }

  /** Resolves once the latest start was accepted or reported as refused. */
  settled(): Promise<void> {
    return this.#started;
  }

  dispose(): void {
    this.stop();
    this.#ports.music.dispose();
  }

  #start(kind: ListenKind, timing: ListenTiming): void {
    const range = listenRange(kind, timing);
    const playing = { kind, range, timing, startedAtMs: this.#ports.clock.now() };
    this.#playing = playing;
    this.#ports.music.setVolume(musicGainAt(timing, range.fromMs - timing.startMs));
    this.#started = this.#ports.music
      .play(range.fromMs / MILLISECONDS_PER_SECOND)
      .catch((error: unknown) => {
        if (this.#playing === playing) {
          this.stop();
        }
        this.#ports.onError(error);
      });
    this.#tick();
  }

  #tick(): void {
    const playing = this.#playing;
    if (playing === null) {
      return;
    }
    const positionMs = playing.range.fromMs + (this.#ports.clock.now() - playing.startedAtMs);
    if (positionMs >= playing.range.toMs) {
      this.stop();
      return;
    }
    this.#ports.music.setVolume(musicGainAt(playing.timing, positionMs - playing.timing.startMs));
    this.#onChange({ kind: playing.kind, positionMs });
    this.#frame = this.#ports.frames.request(() => {
      this.#frame = null;
      this.#tick();
    });
  }
}
