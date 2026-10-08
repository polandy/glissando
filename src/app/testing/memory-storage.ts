import type { KeyValueStorage } from "../start/first-launch";

/** A `localStorage` stand-in that forgets with the test. */
export function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const entries = new Map(Object.entries(initial));
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
  };
}
