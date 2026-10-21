import { describe, expect, it } from "vitest";
import type { NetworkStatus } from "../../immich/immich-availability";
import type { SampleTrack } from "../../sample-music/sample-tracks";
import {
  SamplePreview,
  type SamplePreviewAudio,
  type SamplePreviewError,
  type SamplePreviewPorts,
  type SamplePreviewState,
} from "./sample-preview";

const track: SampleTrack = {
  id: "hold-the-frame",
  title: "Hold the Frame",
  durationMs: 100_000,
  bytes: 1,
  sha256: "irrelevant",
};
const otherTrack: SampleTrack = {
  id: "morning-latitude",
  title: "Morning Latitude",
  durationMs: 50_000,
  bytes: 1,
  sha256: "irrelevant",
};

/** A shared `<audio>` element the test drives and inspects. */
class FakeAudio implements SamplePreviewAudio {
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

class FakeNetwork implements NetworkStatus {
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

function previewWith(overrides: Partial<SamplePreviewPorts> = {}) {
  const audio = new FakeAudio();
  const network = new FakeNetwork(true);
  const urls: string[] = [];
  const revoked: string[] = [];
  const states: SamplePreviewState[] = [];
  const errors: SamplePreviewError[] = [];
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
    ...overrides,
  };
  const preview = new SamplePreview(ports);
  preview.subscribe((state) => states.push(state));
  preview.onError((error) => errors.push(error));
  return { preview, audio, network, urls, revoked, states, errors };
}

describe("SamplePreview", () => {
  it("starts idle", () => {
    const { preview } = previewWith();
    expect(preview.state).toEqual({ kind: "idle" });
  });

  it("streams a track not on this device from the base URL", async () => {
    const { preview, audio, states } = previewWith();

    await preview.toggle(track);

    expect(audio.src).toBe("https://assets.example/music/hold-the-frame.mp3");
    expect(states.at(-1)).toEqual({ kind: "playing", trackId: "hold-the-frame", progress: 0 });
  });

  it("plays a track on this device from a blob URL, without streaming it", async () => {
    const stored = new Blob(["device copy"]);
    const { preview, audio, urls } = previewWith({
      hasMusic: (id) => Promise.resolve(id === "sample-hold-the-frame"),
      musicBlob: (id) =>
        id === "sample-hold-the-frame" ? Promise.resolve(stored) : Promise.reject(new Error("?")),
    });

    await preview.toggle(track);

    expect(audio.src).toBe(urls[0]);
    expect(audio.src.startsWith("blob:")).toBe(true);
  });

  it("reports loading, then playing, as the states a caller's listener sees in order", async () => {
    const { preview, states } = previewWith();

    await preview.toggle(track);

    expect(states).toEqual([
      { kind: "idle" },
      { kind: "loading", trackId: "hold-the-frame" },
      { kind: "playing", trackId: "hold-the-frame", progress: 0 },
    ]);
  });

  it("pauses the playing track on a second tap, keeping its progress", async () => {
    const { preview, audio, states } = previewWith();
    await preview.toggle(track);
    audio.currentTime = 25_000 / 1000;
    const pausedSoFar = audio.paused.length;

    await preview.toggle(track);

    expect(audio.paused.length).toBe(pausedSoFar + 1);
    expect(states.at(-1)).toEqual({ kind: "paused", trackId: "hold-the-frame", progress: 0.25 });
  });

  it("resumes a paused track on a third tap, without re-fetching it", async () => {
    const { preview, audio, states } = previewWith();
    await preview.toggle(track);
    await preview.toggle(track);

    await preview.toggle(track);

    expect(audio.played).toHaveLength(2);
    expect(states.at(-1)).toEqual({ kind: "playing", trackId: "hold-the-frame", progress: 0 });
  });

  it("stops the previous track and starts the new one when a different card is tapped", async () => {
    const { preview, audio, revoked, urls } = previewWith({
      hasMusic: (id) => Promise.resolve(id === "sample-hold-the-frame"),
      musicBlob: () => Promise.resolve(new Blob(["device copy"])),
    });
    await preview.toggle(track);
    const firstUrl = urls[0];

    await preview.toggle(otherTrack);

    expect(revoked).toContain(firstUrl);
    expect(audio.src).toBe("https://assets.example/music/morning-latitude.mp3");
  });

  it("reports progress from the track's duration as the audio element plays", async () => {
    const { preview, audio, states } = previewWith();
    await preview.toggle(track);

    audio.currentTime = 40_000 / 1000;
    audio.emit("timeupdate");

    expect(states.at(-1)).toEqual({ kind: "playing", trackId: "hold-the-frame", progress: 0.4 });
  });

  it("returns to idle, revoking the blob URL, when a device track ends", async () => {
    const { preview, audio, revoked, urls, states } = previewWith({
      hasMusic: () => Promise.resolve(true),
      musicBlob: () => Promise.resolve(new Blob(["device copy"])),
    });
    await preview.toggle(track);

    audio.emit("ended");

    expect(revoked).toEqual(urls);
    expect(states.at(-1)).toEqual({ kind: "idle" });
  });

  it("returns to idle and signals a one-shot error when the audio element fails to load", async () => {
    const { preview, audio, states, errors } = previewWith();
    await preview.toggle(track);

    audio.emit("error");

    expect(states.at(-1)).toEqual({ kind: "idle" });
    expect(errors).toEqual([{ trackId: "hold-the-frame" }]);
  });

  it("ignores a stray error event after the preview was already stopped", async () => {
    const { preview, audio, errors } = previewWith();
    await preview.toggle(track);
    preview.stop();

    audio.emit("error");

    expect(errors).toEqual([]);
  });

  it("signals a one-shot error when the audio element refuses to play", async () => {
    const failure = new Error("autoplay refused");
    const refusingAudio = new FakeAudio();
    refusingAudio.playResult = () => Promise.reject(failure);
    const { preview, states, errors } = previewWith({
      createAudioElement: () => refusingAudio,
    });

    await preview.toggle(track);

    expect(states.at(-1)).toEqual({ kind: "idle" });
    expect(errors).toEqual([{ trackId: "hold-the-frame" }]);
  });

  it("fails at once, without streaming, a track not on this device while offline", async () => {
    const offline = new FakeNetwork(false);
    const { preview, audio, states, errors } = previewWith({ network: offline });

    await preview.toggle(track);

    expect(audio.src).toBe("");
    expect(states.at(-1)).toEqual({ kind: "idle" });
    expect(errors).toEqual([{ trackId: "hold-the-frame" }]);
  });

  it("plays a track already on this device while offline", async () => {
    const offline = new FakeNetwork(false);
    const { preview, audio, states } = previewWith({
      network: offline,
      hasMusic: () => Promise.resolve(true),
      musicBlob: () => Promise.resolve(new Blob(["device copy"])),
    });

    await preview.toggle(track);

    expect(states.at(-1)?.kind).toBe("playing");
    expect(audio.src.startsWith("blob:")).toBe(true);
  });

  it("stops a streamed preview when the connection drops", async () => {
    const { preview, network, states } = previewWith();
    await preview.toggle(track);

    network.go(false);

    expect(states.at(-1)).toEqual({ kind: "idle" });
  });

  it("leaves a device preview playing when the connection drops", async () => {
    const { preview, network, states } = previewWith({
      hasMusic: () => Promise.resolve(true),
      musicBlob: () => Promise.resolve(new Blob(["device copy"])),
    });
    await preview.toggle(track);

    network.go(false);

    expect(states.at(-1)?.kind).toBe("playing");
  });

  it("stops cleanly when nothing is playing", () => {
    const { preview, states } = previewWith();

    preview.stop();

    expect(states).toEqual([{ kind: "idle" }]);
  });
});
