import type { HistoryPort } from "../navigation/navigator";

/** An in-memory session history with the browser's semantics: a push drops forward entries. */
export class FakeHistory implements HistoryPort {
  entries: unknown[];
  index: number;
  #listeners: ((state: unknown) => void)[] = [];
  #pendingPop: number | null = null;

  constructor(entries: unknown[] = [null], index = entries.length - 1) {
    this.entries = entries;
    this.index = index;
  }

  get state(): unknown {
    return this.entries[this.index];
  }

  push(state: unknown): void {
    this.entries = [...this.entries.slice(0, this.index + 1), state];
    this.index += 1;
  }

  replace(state: unknown): void {
    this.entries[this.index] = state;
  }

  go(delta: number): void {
    // The browser moves asynchronously; the move lands when the test calls `deliverPop`.
    this.#pendingPop = delta;
  }

  onPop(listener: (state: unknown) => void): () => void {
    this.#listeners.push(listener);
    return () => {
      this.#listeners = this.#listeners.filter((other) => other !== listener);
    };
  }

  /** The browser's back gesture or a finished `go`. */
  deliverPop(delta = this.#pendingPop ?? -1): void {
    this.#pendingPop = null;
    this.index = Math.max(0, Math.min(this.entries.length - 1, this.index + delta));
    for (const listener of this.#listeners) {
      listener(this.state);
    }
  }
}
