import type { Scheduler } from "../../ui-kit/scheduler";

export const TOAST_DURATION_MS = 6000;

export type ToastTone = "info" | "error";

export interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

export interface ToastMessage {
  readonly text: string;
  readonly tone: ToastTone;
  readonly action?: ToastAction;
  /** Called once the toast leaves without its action run: it expired, or was dismissed or replaced. */
  readonly onClosed?: () => void;
}

/** One toast at a time: a new one replaces the shown one; each dismisses itself after 6 s. */
export class Toaster {
  readonly #scheduler: Scheduler;
  readonly #listeners = new Set<(toast: ToastMessage | null) => void>();
  #current: ToastMessage | null = null;
  #cancelTimeout: (() => void) | null = null;

  constructor(scheduler: Scheduler) {
    this.#scheduler = scheduler;
  }

  get current(): ToastMessage | null {
    return this.#current;
  }

  show(toast: ToastMessage): void {
    this.#cancelTimeout?.();
    this.#cancelTimeout = this.#scheduler.after(TOAST_DURATION_MS, () => this.dismiss());
    this.#set(toast);
  }

  dismiss(): void {
    this.#cancelTimeout?.();
    this.#cancelTimeout = null;
    this.#set(null);
  }

  /** Runs the shown toast's action; dismissing first lets the action show a follow-up toast. */
  act(): void {
    const action = this.#current?.action;
    if (action === undefined) {
      throw new Error("the shown toast has no action to run");
    }
    this.#cancelTimeout?.();
    this.#cancelTimeout = null;
    this.#set(null, { acted: true });
    action.run();
  }

  /** Called with every change; returns the unsubscribe function. */
  subscribe(listener: (toast: ToastMessage | null) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #set(toast: ToastMessage | null, { acted = false } = {}): void {
    const previous = this.#current;
    this.#current = toast;
    for (const listener of this.#listeners) {
      listener(toast);
    }
    if (previous !== null && previous !== toast && !acted) {
      previous.onClosed?.();
    }
  }
}
