import type { KeyValueStorage } from "../app/start/first-launch";

/** What a server slideshow's card shows without its cover, kept for when the server is away. */
export interface ServerSlideshowCard {
  readonly id: string;
  readonly title: string;
  readonly pictureCount: number;
  readonly durationSeconds: number;
  readonly hasMusic: boolean;
}

/**
 * What this device remembers of the server library between app starts (`dev-docs/
 * SERVER_LIBRARY.md`, Availability): whether it was on, and the last list's cards. Fail-soft: a
 * device whose storage refuses remembers nothing.
 */
export interface ServerLibraryMemory {
  wasOn(): boolean;
  rememberOn(on: boolean): void;
  cards(): readonly ServerSlideshowCard[];
  rememberCards(cards: readonly ServerSlideshowCard[]): void;
}

const MEMORY_KEY = "glissando.serverLibrary";

interface Remembered {
  readonly on: boolean;
  readonly cards: readonly ServerSlideshowCard[];
}

const NOTHING_REMEMBERED: Remembered = { on: false, cards: [] };

function isCard(value: unknown): value is ServerSlideshowCard {
  if (typeof value !== "object" || value === null) return false;
  const card = value as Record<string, unknown>;
  return (
    typeof card["id"] === "string" &&
    typeof card["title"] === "string" &&
    typeof card["pictureCount"] === "number" &&
    typeof card["durationSeconds"] === "number" &&
    typeof card["hasMusic"] === "boolean"
  );
}

function parseRemembered(text: string | null): Remembered {
  if (text === null) return NOTHING_REMEMBERED;
  const value: unknown = JSON.parse(text);
  if (typeof value !== "object" || value === null) return NOTHING_REMEMBERED;
  const { on, cards } = value as Record<string, unknown>;
  if (typeof on !== "boolean" || !Array.isArray(cards) || !cards.every(isCard)) {
    return NOTHING_REMEMBERED;
  }
  return { on, cards };
}

export function createStorageServerLibraryMemory(
  storage: KeyValueStorage,
  log: (error: unknown) => void,
): ServerLibraryMemory {
  const read = (): Remembered => {
    try {
      return parseRemembered(storage.getItem(MEMORY_KEY));
    } catch (error) {
      log(error);
      return NOTHING_REMEMBERED;
    }
  };
  const write = (remembered: Remembered): void => {
    try {
      storage.setItem(MEMORY_KEY, JSON.stringify(remembered));
    } catch (error) {
      log(error);
    }
  };
  return {
    wasOn: () => read().on,
    rememberOn: (on) => write(on ? { ...read(), on } : NOTHING_REMEMBERED),
    cards: () => read().cards,
    rememberCards: (cards) => write({ ...read(), cards }),
  };
}
