import type { Clock, FrameScheduler } from "../../player";
import { NEXT_HOLD_MS } from "./timing/preview-timeline";

export interface MotionPreviewState {
  readonly playing: boolean;
  /** Into the loop: the picture's duration, then the hold on what follows. */
  readonly elapsedMs: number;
  /** Paused on a frame being edited: the preview shows this picture alone, no transition. */
  readonly onFrame: boolean;
}

export interface MotionPreviewPorts {
  readonly clock: Clock;
  readonly frames: FrameScheduler;
}

/**
 * The picture editor's preview clock: runs over the slide's real duration and a short hold on
 * what follows, then loops. Time comes from the injected clock, one step per animation frame.
 */
export class MotionPreview {
  #durationMs: number;
  readonly #ports: MotionPreviewPorts;
  readonly #listeners = new Set<(state: MotionPreviewState) => void>();
  #state: MotionPreviewState;
  /** The clock time the current loop started at; meaningful while playing. */
  #startedAt = 0;
  #frame: number | null = null;

  constructor(
    initial: { readonly durationMs: number; readonly playing: boolean },
    ports: MotionPreviewPorts,
  ) {
    this.#durationMs = initial.durationMs;
    this.#ports = ports;
    this.#state = { playing: false, elapsedMs: 0, onFrame: false };
    if (initial.playing) {
      this.play();
    }
  }

  get state(): MotionPreviewState {
    return this.#state;
  }

  /** Called with every change; returns the unsubscribe function. */
  subscribe(listener: (state: MotionPreviewState) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Goes on from where it rests; held on a frame, starts over. */
  play(): void {
    if (this.#state.playing) {
      return;
    }
    this.playFrom(this.#state.onFrame ? 0 : this.#state.elapsedMs);
  }

  playFrom(elapsedMs: number): void {
    this.#cancelFrame();
    this.#startedAt = this.#ports.clock.now() - elapsedMs;
    this.#set({ playing: true, elapsedMs, onFrame: false });
    this.#requestFrame();
  }

  pause(): void {
    this.#cancelFrame();
    this.#set({ ...this.#state, playing: false });
  }

  /** Pauses at `elapsedMs`, e.g. half-way through a transition just picked. */
  restAt(elapsedMs: number): void {
    this.#cancelFrame();
    this.#set({ playing: false, elapsedMs, onFrame: false });
  }

  /** Pauses on this picture's framing at `progress` (0..1), e.g. the frame being dragged. */
  holdAt(progress: number): void {
    this.#cancelFrame();
    this.#set({ playing: false, elapsedMs: progress * this.#durationMs, onFrame: true });
  }

  /** Starts over, playing. */
  restart(): void {
    this.playFrom(0);
  }

  /** The picture's duration changed; the caller decides where the preview goes on. */
  retime(durationMs: number): void {
    this.#durationMs = durationMs;
  }

  dispose(): void {
    this.#cancelFrame();
    this.#listeners.clear();
  }

  #tick(): void {
    this.#frame = null;
    const elapsedMs =
      (this.#ports.clock.now() - this.#startedAt) % (this.#durationMs + NEXT_HOLD_MS);
    this.#set({ playing: true, elapsedMs, onFrame: false });
    this.#requestFrame();
  }

  #requestFrame(): void {
    this.#frame = this.#ports.frames.request(() => this.#tick());
  }

  #cancelFrame(): void {
    if (this.#frame !== null) {
      this.#ports.frames.cancel(this.#frame);
      this.#frame = null;
    }
  }

  #set(state: MotionPreviewState): void {
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}
