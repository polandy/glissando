import type { PersistentStorageResult } from "../../library/persistent-storage";
import type { KeyValueStorage } from "../start/first-launch";

/** Remembers, across reloads, that the user was told about a refused persistent storage. */
export interface RefusalNoticeStore {
  wasShown(): boolean;
  recordShown(): void;
}

const REFUSAL_SHOWN_KEY = "glissando.persistRefusalShown";
const REFUSAL_SHOWN_VALUE = "true";

export function createStorageRefusalNoticeStore(storage: KeyValueStorage): RefusalNoticeStore {
  return {
    wasShown: () => storage.getItem(REFUSAL_SHOWN_KEY) !== null,
    recordShown: () => storage.setItem(REFUSAL_SHOWN_KEY, REFUSAL_SHOWN_VALUE),
  };
}

/**
 * Asks the browser to keep the library once a tab has created a slideshow, when there is
 * something worth keeping. A refusal is told once; the app works on either way.
 */
export class PersistencePrompt {
  readonly #request: () => Promise<PersistentStorageResult>;
  readonly #notice: RefusalNoticeStore;
  #asked = false;

  constructor(request: () => Promise<PersistentStorageResult>, notice: RefusalNoticeStore) {
    this.#request = request;
    this.#notice = notice;
  }

  /** Whether to show the "persistent storage refused" dialog now. */
  async afterCreate(): Promise<boolean> {
    if (this.#asked) {
      return false;
    }
    this.#asked = true;
    if ((await this.#request()) !== "refused" || this.#notice.wasShown()) {
      return false;
    }
    this.#notice.recordShown();
    return true;
  }
}
