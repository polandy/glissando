/** Runs a callback once after a delay; the port the UI's timeouts go through, faked in tests. */
export interface Scheduler {
  /** Returns the function that cancels the callback. */
  after(delayMs: number, callback: () => void): () => void;
}

export const browserScheduler: Scheduler = {
  after(delayMs, callback) {
    const handle = setTimeout(callback, delayMs);
    return () => clearTimeout(handle);
  },
};
