import type { Clock, FrameScheduler } from "../../player";

/** After each run the preview rests on the end framing this long before it starts over. */
export const LOOP_HOLD_MS = 700;

export interface MotionPreviewState {
  readonly playing: boolean;
  /** How far through the motion, 0..1, linear in time. */
  readonly progress: number;
}

export interface MotionPreviewPorts {
  readonly clock: Clock;
  readonly frames: FrameScheduler;
}

/**
 * The picture editor's preview clock: runs the motion over the slide's real duration and loops
 * with a short hold. Time comes from the injected clock, one step per animation frame.
 */
export class MotionPreview {
  readonly #durationMs: number;
  readonly #ports: MotionPreviewPorts;
  readonly #listeners = new Set<(state: MotionPreviewState) => void>();
  #state: MotionPreviewState;
  /** The clock time the current run started at; meaningful while playing. */
  #startedAt = 0;
  /** Held at a frame: the next play starts the motion over. */
  #held = false;
  #frame: number | null = null;

  constructor(
    initial: { readonly durationMs: number; readonly playing: boolean },
    ports: MotionPreviewPorts,
  ) {
    this.#durationMs = initial.durationMs;
    this.#ports = ports;
    this.#state = { playing: false, progress: 0 };
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

  play(): void {
    if (this.#state.playing) {
      return;
    }
    const progress = this.#held ? 0 : this.#state.progress;
    this.#held = false;
    this.#startedAt = this.#ports.clock.now() - progress * this.#durationMs;
    this.#set({ playing: true, progress });
    this.#requestFrame();
  }

  pause(): void {
    this.#cancelFrame();
    this.#set({ playing: false, progress: this.#state.progress });
  }

  /** Pauses on the framing at `progress`, e.g. the frame being dragged. */
  holdAt(progress: number): void {
    this.#cancelFrame();
    this.#held = true;
    this.#set({ playing: false, progress });
  }

  /** Starts the motion over, playing. */
  restart(): void {
    this.holdAt(0);
    this.play();
  }

  dispose(): void {
    this.#cancelFrame();
    this.#listeners.clear();
  }

  #tick(): void {
    this.#frame = null;
    const elapsed = (this.#ports.clock.now() - this.#startedAt) % (this.#durationMs + LOOP_HOLD_MS);
    this.#set({ playing: true, progress: Math.min(1, elapsed / this.#durationMs) });
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
