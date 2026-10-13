import type { KeyValueStorage } from "../start/first-launch";
import { createStoredChoice, type StoredChoice } from "../settings/stored-choice";
import type { FrameOrder } from "../../frame/frame-deck";

export const FRAME_INTERVAL_SECONDS = [10, 30, 60, 300] as const;
export type FrameIntervalSeconds = (typeof FRAME_INTERVAL_SECONDS)[number];
const DEFAULT_FRAME_INTERVAL_SECONDS: FrameIntervalSeconds = 30;

const FRAME_ORDERS: readonly FrameOrder[] = ["shuffled", "newestFirst", "oldestFirst"];
const DEFAULT_FRAME_ORDER: FrameOrder = "shuffled";

const ON_OFF = ["on", "off"] as const;
type OnOff = (typeof ON_OFF)[number];

const ALBUM_KEY = "glissando.frame.album";
const INTERVAL_KEY = "glissando.frame.intervalSeconds";
const ORDER_KEY = "glissando.frame.order";
const SHOW_CLOCK_KEY = "glissando.frame.showClock";
const SHOW_DATE_KEY = "glissando.frame.showDate";

export interface FramePreferencesState {
  /** The album chosen on this device; null before any "Start frame". */
  readonly albumId: string | null;
  readonly intervalSeconds: FrameIntervalSeconds;
  readonly order: FrameOrder;
  readonly showClock: boolean;
  readonly showDate: boolean;
}

export interface FramePreferencesPorts {
  readonly album: { read(): string | null; write(albumId: string): void };
  readonly interval: StoredChoice<`${FrameIntervalSeconds}`>;
  readonly order: StoredChoice<FrameOrder>;
  readonly showClock: StoredChoice<OnOff>;
  readonly showDate: StoredChoice<OnOff>;
}

/** The picture frame's set-up choices, kept on this device (`dev-docs/app/FRAME.md`). */
export class FramePreferences {
  readonly #ports: FramePreferencesPorts;
  readonly #listeners = new Set<(state: FramePreferencesState) => void>();
  #state: FramePreferencesState;

  constructor(ports: FramePreferencesPorts) {
    this.#ports = ports;
    this.#state = {
      albumId: ports.album.read(),
      intervalSeconds: Number(ports.interval.read()) as FrameIntervalSeconds,
      order: ports.order.read(),
      showClock: ports.showClock.read() === "on",
      showDate: ports.showDate.read() === "on",
    };
  }

  get state(): FramePreferencesState {
    return this.#state;
  }

  /** Called with the current state at once, then with every change; returns the unsubscribe. */
  subscribe(listener: (state: FramePreferencesState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  setAlbum(albumId: string): void {
    this.#ports.album.write(albumId);
    this.#set({ ...this.#state, albumId });
  }

  setIntervalSeconds(intervalSeconds: FrameIntervalSeconds): void {
    this.#ports.interval.write(`${intervalSeconds}`);
    this.#set({ ...this.#state, intervalSeconds });
  }

  setOrder(order: FrameOrder): void {
    this.#ports.order.write(order);
    this.#set({ ...this.#state, order });
  }

  setShowClock(showClock: boolean): void {
    this.#ports.showClock.write(showClock ? "on" : "off");
    this.#set({ ...this.#state, showClock });
  }

  setShowDate(showDate: boolean): void {
    this.#ports.showDate.write(showDate ? "on" : "off");
    this.#set({ ...this.#state, showDate });
  }

  #set(state: FramePreferencesState): void {
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}

export function createStorageFramePreferences(storage: KeyValueStorage): FramePreferencesPorts {
  return {
    album: {
      read: () => storage.getItem(ALBUM_KEY),
      write: (albumId) => storage.setItem(ALBUM_KEY, albumId),
    },
    interval: createStoredChoice(
      storage,
      INTERVAL_KEY,
      FRAME_INTERVAL_SECONDS.map((seconds) => `${seconds}` as const),
      `${DEFAULT_FRAME_INTERVAL_SECONDS}`,
    ),
    order: createStoredChoice(storage, ORDER_KEY, FRAME_ORDERS, DEFAULT_FRAME_ORDER),
    showClock: createStoredChoice(storage, SHOW_CLOCK_KEY, ON_OFF, "on"),
    showDate: createStoredChoice(storage, SHOW_DATE_KEY, ON_OFF, "on"),
  };
}
