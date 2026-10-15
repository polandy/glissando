import type { KeyValueStorage } from "../start/first-launch";
import { createStoredChoice, type StoredChoice } from "../settings/stored-choice";

const CARD_CHOICES = ["shown", "hidden"] as const;
type CardChoice = (typeof CARD_CHOICES)[number];

const CARD_KEY = "glissando.frame.cardShown";

/** Whether the start screen offers the picture frame card, kept in this browser (`dev-docs/app/FRAME.md`). */
export class FrameCardPreference {
  readonly #port: StoredChoice<CardChoice>;
  readonly #listeners = new Set<(shown: boolean) => void>();
  #shown: boolean;

  constructor(port: StoredChoice<CardChoice>) {
    this.#port = port;
    this.#shown = port.read() === "shown";
  }

  get shown(): boolean {
    return this.#shown;
  }

  /** Called with the current choice at once, then with every change; returns the unsubscribe. */
  subscribe(listener: (shown: boolean) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#shown);
    return () => this.#listeners.delete(listener);
  }

  setShown(shown: boolean): void {
    this.#port.write(shown ? "shown" : "hidden");
    this.#shown = shown;
    for (const listener of this.#listeners) {
      listener(shown);
    }
  }
}

export function createStorageFrameCardPreference(
  storage: KeyValueStorage,
): StoredChoice<CardChoice> {
  return createStoredChoice(storage, CARD_KEY, CARD_CHOICES, "shown");
}
