import type { PersistentStorageResult } from "../library/persistent-storage";
import type { InstallGuide } from "./install-guide";
import type { PwaState } from "./status-bar-view";

export interface InstallChoice {
  readonly outcome: "accepted" | "dismissed";
}

/** The part of Chromium's `beforeinstallprompt` event the app uses. */
export interface InstallPromptEvent {
  preventDefault(): void;
  prompt(): Promise<void>;
  readonly userChoice: Promise<InstallChoice>;
}

export interface HintDismissalStore {
  wasDismissed(): boolean;
  recordDismissed(): void;
}

export interface PwaPorts {
  readonly secureContext: boolean;
  readonly runningInstalled: boolean;
  readonly installGuide: InstallGuide | null;
  onInstallPrompt(listener: (event: InstallPromptEvent) => void): void;
  onInstalled(listener: () => void): void;
  readonly hintDismissal: HintDismissalStore;
  readonly storage: {
    /** Whether the user was told that persistent storage was refused. */
    refusalTold(): boolean;
    persisted(): Promise<boolean>;
    request(): Promise<PersistentStorageResult>;
  };
  readonly updates: {
    /** Called once a new version waits; at once if one already does. */
    onWaiting(listener: () => void): void;
    /** Lets the waiting version take over and reloads this tab. */
    apply(): void;
  };
}

const HINT_DISMISSED_KEY = "glissando.installHintDismissed";
const HINT_DISMISSED_VALUE = "true";

export function createStorageHintDismissalStore(
  storage: Pick<Storage, "getItem" | "setItem">,
): HintDismissalStore {
  return {
    wasDismissed: () => storage.getItem(HINT_DISMISSED_KEY) !== null,
    recordDismissed: () => storage.setItem(HINT_DISMISSED_KEY, HINT_DISMISSED_VALUE),
  };
}

const ACCEPTED: InstallChoice["outcome"] = "accepted";

/** Whether Glissando is installable, installed, kept and up to date, for the status bar. */
export class PwaStatus {
  readonly #ports: PwaPorts;
  readonly #listeners = new Set<(state: PwaState) => void>();
  #state: PwaState;
  #installPrompt: InstallPromptEvent | null = null;

  constructor(ports: PwaPorts) {
    this.#ports = ports;
    this.#state = {
      secureContext: ports.secureContext,
      installed: ports.runningInstalled,
      installPromptAvailable: false,
      installGuide: ports.installGuide,
      hintDismissed: ports.hintDismissal.wasDismissed(),
      storageRefused: false,
      updateWaiting: false,
    };
    ports.onInstallPrompt((event) => {
      // Kept for the hint's button rather than shown by the browser on its own.
      event.preventDefault();
      this.#installPrompt = event;
      this.#set({ installPromptAvailable: true });
    });
    ports.onInstalled(() => this.#set({ installed: true }));
    ports.updates.onWaiting(() => this.#set({ updateWaiting: true }));
  }

  get state(): PwaState {
    return this.#state;
  }

  /** Called with every change; returns the unsubscribe function. */
  subscribe(listener: (state: PwaState) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Reads whether a told refusal still holds; installed, asks for persistent storage again. */
  async start(): Promise<void> {
    const { storage } = this.#ports;
    if (!storage.refusalTold()) {
      return;
    }
    // Browsers grant persistent storage to installed apps without asking.
    const refused = this.#state.installed
      ? (await storage.request()) === "refused"
      : !(await storage.persisted());
    this.#set({ storageRefused: refused });
  }

  /** Opens the browser's install prompt; a prompt can be shown only once. */
  async install(): Promise<void> {
    const prompt = this.#installPrompt;
    if (prompt === null) {
      throw new Error("no install prompt kept: the browser has not offered one");
    }
    this.#installPrompt = null;
    this.#set({ installPromptAvailable: false });
    await prompt.prompt();
    if ((await prompt.userChoice).outcome === ACCEPTED) {
      this.#set({ installed: true });
    }
  }

  dismissHint(): void {
    this.#ports.hintDismissal.recordDismissed();
    this.#set({ hintDismissed: true });
  }

  reload(): void {
    this.#ports.updates.apply();
  }

  storageRefusalTold(): void {
    this.#set({ storageRefused: true });
  }

  #set(change: Partial<PwaState>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
