import type { KeyValueStorage } from "../storage/storage-port.ts";

/** One of a fixed set of choices, kept on this device. */
export interface StoredChoice<Choice extends string> {
  read(): Choice;
  write(choice: Choice): void;
}

export function createStoredChoice<Choice extends string>(
  storage: KeyValueStorage,
  key: string,
  choices: readonly Choice[],
  fallback: Choice,
  warn: (message: string) => void = console.warn,
): StoredChoice<Choice> {
  let warned = false;
  return {
    // A stored value this version does not know reads as the default, with one warning.
    read: () => {
      const stored = storage.getItem(key);
      const known = choices.find((choice) => choice === stored);
      if (known !== undefined) return known;
      if (stored !== null && !warned) {
        warned = true;
        warn(`unknown stored value ${JSON.stringify(stored)} for "${key}"; using "${fallback}"`);
      }
      return fallback;
    },
    write: (choice) => storage.setItem(key, choice),
  };
}
