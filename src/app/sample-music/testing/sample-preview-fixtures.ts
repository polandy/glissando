import type { NetworkStatus } from "../../../immich/immich-availability";
import type { SampleTrack } from "../../../sample-music/sample-tracks";
import {
  SamplePreview,
  type SamplePreviewAudio,
  type SamplePreviewError,
  type SamplePreviewPorts,
  type SamplePreviewState,
} from "../sample-preview";

export const track: SampleTrack = {
  id: "hold-the-frame",
  title: "Hold the Frame",
  durationMs: 100_000,
  bytes: 1,
  sha256: "irrelevant",
};
export const otherTrack: SampleTrack = {
  id: "morning-latitude",
  title: "Morning Latitude",
  durationMs: 50_000,
  bytes: 1,
  sha256: "irrelevant",
};

/** A shared `<audio>` element the test drives and inspects. */
export class FakeAudio implements SamplePreviewAudio {
  src = "";
  currentTime = 0;
  readonly played: string[] = [];
  readonly paused: boolean[] = [];
  playResult: () => Promise<void> = () => Promise.resolve();
  readonly #listeners = new Map<string, Set<() => void>>();

  play(): Promise<void> {
    this.played.push(this.src);
    return this.playResult();
  }

  pause(): void {
    this.paused.push(true);
  }

  addEventListener(type: string, listener: () => void): void {
    const set = this.#listeners.get(type) ?? new Set<() => void>();
    this.#listeners.set(type, set);
    set.add(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.#listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const listener of this.#listeners.get(type) ?? []) listener();
  }
}

export class FakeNetwork implements NetworkStatus {
  #online: boolean;
  readonly #listeners = new Set<(online: boolean) => void>();

  constructor(online: boolean) {
    this.#online = online;
  }

  isOnline(): boolean {
    return this.#online;
  }

  onChange(listener: (online: boolean) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  go(online: boolean): void {
    this.#online = online;
    for (const listener of this.#listeners) listener(online);
  }
}

export function previewWith(overrides: Partial<SamplePreviewPorts> = {}) {
  const audio = new FakeAudio();
  const network = new FakeNetwork(true);
  const urls: string[] = [];
  const revoked: string[] = [];
  const states: SamplePreviewState[] = [];
  const errors: SamplePreviewError[] = [];
  const portErrors: unknown[] = [];
  const ports: SamplePreviewPorts = {
    baseUrl: "https://assets.example/music/",
    hasMusic: () => Promise.resolve(false),
    musicBlob: () => Promise.reject(new Error("not stored")),
    network,
    createAudioElement: () => audio,
    create: () => {
      const url = `blob:${urls.length}`;
      urls.push(url);
      return url;
    },
    revoke: (url) => revoked.push(url),
    onError: (error) => portErrors.push(error),
    ...overrides,
  };
  const preview = new SamplePreview(ports);
  preview.subscribe((state) => states.push(state));
  preview.onError((error) => errors.push(error));
  return { preview, audio, network, urls, revoked, states, errors, portErrors };
}
