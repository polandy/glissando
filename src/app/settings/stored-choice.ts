import type { KeyValueStorage } from "../start/first-launch";

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
): StoredChoice<Choice> {
  return {
    // A stored value this version does not know reads as the default.
    read: () => {
      const stored = storage.getItem(key);
      return choices.find((choice) => choice === stored) ?? fallback;
    },
    write: (choice) => storage.setItem(key, choice),
  };
}
