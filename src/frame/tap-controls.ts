import type { Scheduler } from "../ui-kit/scheduler";

/** How long a tap keeps the exit pill and bottom bar on screen before they hide themselves. */
export const CONTROLS_VISIBLE_MS = 4000;

/**
 * The running frame's tap-to-reveal controls: a tap shows the exit pill and bottom bar for a
 * few seconds, a further tap hides them early, Esc/back hide them for good (`hide`).
 */
export class TapControls {
  readonly #scheduler: Scheduler;
  readonly #listeners = new Set<(visible: boolean) => void>();
  #visible = false;
  #cancelTimeout: (() => void) | null = null;

  constructor(scheduler: Scheduler) {
    this.#scheduler = scheduler;
  }

  get visible(): boolean {
    return this.#visible;
  }

  /** Shows the controls with a fresh timeout, or hides them early if already shown. */
  tap(): void {
    if (this.#visible) {
      this.hide();
      return;
    }
    this.#cancelTimeout = this.#scheduler.after(CONTROLS_VISIBLE_MS, () => this.hide());
    this.#set(true);
  }

  hide(): void {
    if (!this.#visible) {
      return;
    }
    this.#cancelTimeout?.();
    this.#cancelTimeout = null;
    this.#set(false);
  }

  /** Called with every change; returns the unsubscribe function. */
  subscribe(listener: (visible: boolean) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #set(visible: boolean): void {
    this.#visible = visible;
    for (const listener of this.#listeners) {
      listener(visible);
    }
  }
}
