import type { ImmichClient, ImmichStatus } from "./immich-client";

/** The device's network connection, as the browser reports it. */
export interface NetworkStatus {
  isOnline(): boolean;
  /** Calls the listener on every change; returns the unsubscribe. */
  onChange(listener: (online: boolean) => void): () => void;
}

/**
 * `ImmichStatus`, or `checking` until the first answer: the UI shows nothing about Immich yet
 * (no Immich box, a neutral line in the settings).
 */
export type ImmichAvailabilityState = ImmichStatus | { readonly kind: "checking" };

const CHECKING: ImmichAvailabilityState = { kind: "checking" };
const OFFLINE: ImmichAvailabilityState = { kind: "offline" };
const ONLINE_EVENT = "online";
const OFFLINE_EVENT = "offline";

export interface ImmichAvailabilityOptions {
  readonly client: ImmichClient;
  readonly network: NetworkStatus;
}

/** Whether Immich can be used right now, published with the Svelte store contract. */
export class ImmichAvailability {
  readonly #client: ImmichClient;
  readonly #listeners = new Set<(state: ImmichAvailabilityState) => void>();
  readonly #stopListeningToNetwork: () => void;
  #state: ImmichAvailabilityState;
  #inFlight: Promise<void> | null = null;
  /** Bumped when the device goes offline, so a check under way then cannot overwrite it. */
  #generation = 0;

  constructor(options: ImmichAvailabilityOptions) {
    this.#client = options.client;
    this.#state = options.network.isOnline() ? CHECKING : OFFLINE;
    this.#stopListeningToNetwork = options.network.onChange((online) => {
      if (online) {
        void this.check();
      } else {
        this.#generation += 1;
        this.#inFlight = null;
        this.#publish(OFFLINE);
      }
    });
  }

  get state(): ImmichAvailabilityState {
    return this.#state;
  }

  subscribe(listener: (state: ImmichAvailabilityState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /** Asks Immich; a check while one is under way shares it. */
  check(): Promise<void> {
    this.#inFlight ??= this.#ask(this.#generation);
    return this.#inFlight;
  }

  /** Resolves once the check under way, if any, has published its answer. */
  async settled(): Promise<void> {
    while (this.#inFlight !== null) await this.#inFlight;
  }

  dispose(): void {
    this.#stopListeningToNetwork();
  }

  async #ask(generation: number): Promise<void> {
    try {
      const status = await this.#client.status();
      if (generation === this.#generation) this.#publish(status);
    } finally {
      if (generation === this.#generation) this.#inFlight = null;
    }
  }

  #publish(state: ImmichAvailabilityState): void {
    this.#state = state;
    for (const listener of this.#listeners) listener(state);
  }
}

/** The browser window's `navigator.onLine` and its online/offline events. */
export function browserNetworkStatus(
  target: EventTarget & { readonly navigator: { readonly onLine: boolean } },
): NetworkStatus {
  return {
    isOnline: () => target.navigator.onLine,
    onChange(listener) {
      const goOnline = () => listener(true);
      const goOffline = () => listener(false);
      target.addEventListener(ONLINE_EVENT, goOnline);
      target.addEventListener(OFFLINE_EVENT, goOffline);
      return () => {
        target.removeEventListener(ONLINE_EVENT, goOnline);
        target.removeEventListener(OFFLINE_EVENT, goOffline);
      };
    },
  };
}
