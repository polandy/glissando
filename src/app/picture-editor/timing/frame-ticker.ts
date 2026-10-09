import type { MotionPreviewPorts } from "../motion-preview";

/** Tells `onTick` the time since it started, at once and then once per animation frame. */
export class FrameTicker {
  readonly #ports: MotionPreviewPorts;
  readonly #onTick: (elapsedMs: number) => void;
  readonly #startedAt: number;
  #frame: number | null = null;

  constructor(ports: MotionPreviewPorts, onTick: (elapsedMs: number) => void) {
    this.#ports = ports;
    this.#onTick = onTick;
    this.#startedAt = ports.clock.now();
    this.#tick();
  }

  stop(): void {
    if (this.#frame !== null) {
      this.#ports.frames.cancel(this.#frame);
      this.#frame = null;
    }
  }

  #tick(): void {
    this.#onTick(this.#ports.clock.now() - this.#startedAt);
    this.#frame = this.#ports.frames.request(() => this.#tick());
  }
}
