import type { Scheduler } from "../scheduler";

/** Time moves only when a test calls `advance`. */
export class FakeScheduler implements Scheduler {
  #now = 0;
  #timers: { at: number; callback: () => void }[] = [];

  after(delayMs: number, callback: () => void): () => void {
    const timer = { at: this.#now + delayMs, callback };
    this.#timers.push(timer);
    return () => {
      this.#timers = this.#timers.filter((other) => other !== timer);
    };
  }

  advance(ms: number): void {
    const until = this.#now + ms;
    for (;;) {
      const due = this.#timers.filter((timer) => timer.at <= until).sort((a, b) => a.at - b.at)[0];
      if (due === undefined) {
        break;
      }
      this.#timers = this.#timers.filter((other) => other !== due);
      this.#now = due.at;
      due.callback();
    }
    this.#now = until;
  }

  get pending(): number {
    return this.#timers.length;
  }
}
