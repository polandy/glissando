import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NetworkStatus } from "../../immich/immich-availability";
import {
  sampleMediaId,
  type SampleTrack,
  type SampleTrackId,
} from "../../sample-music/sample-tracks";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { Toaster } from "../toast/toaster";
import SampleMusicGrid from "./SampleMusicGrid.svelte";
import { SamplePreview, type SamplePreviewAudio, type SamplePreviewPorts } from "./sample-preview";

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
}

const dummyAudio = (): SamplePreviewAudio => ({
  src: "",
  currentTime: 0,
  play: () => Promise.resolve(),
  pause: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
});

function previewWith(overrides: Partial<SamplePreviewPorts> = {}): SamplePreview {
  return new SamplePreview({
    baseUrl: "https://assets.example/music/",
    hasMusic: () => Promise.resolve(false),
    musicBlob: () => Promise.reject(new Error("not stored")),
    network: new FakeNetwork(true),
    createAudioElement: dummyAudio,
    create: () => "blob:0",
    revoke: () => undefined,
    ...overrides,
  });
}

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

function mountGrid(
  preview: SamplePreview,
  isAdded: (trackId: SampleTrackId) => boolean = () => false,
) {
  const toggled: SampleTrack[] = [];
  const mounted = mountWithTranslator(
    SampleMusicGrid,
    {
      preview,
      isAdded,
      onToggle: (track: SampleTrack) => toggled.push(track),
      toaster: new Toaster(new FakeScheduler()),
    },
    { current: createTranslator("en") },
  );
  unmounts.push(mounted.destroy);
  return { target: mounted.target, toggled };
}

const cardFor = (target: HTMLElement, title: string): HTMLElement => {
  const card = [...target.querySelectorAll(".card")].find(
    (candidate) => candidate.querySelector(".name")?.textContent?.trim() === title,
  );
  if (card === undefined) throw new Error(`no card for "${title}"`);
  return card as HTMLElement;
};

// hasTrackOnDevice resolves on a microtask per track; a flush after lets its effect settle.
async function settled(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  flushSync();
}

describe("SampleMusicGrid, online", () => {
  it("shows no offline notice, and every card's Add enabled", async () => {
    const { target } = mountGrid(previewWith());
    await settled();

    expect(target.querySelector(".notice")).toBeNull();
    const add = cardFor(target, "Hold the Frame").querySelector<HTMLButtonElement>(".add");
    expect(add?.disabled).toBe(false);
    expect(target.querySelector(".status")).toBeNull();
  });
});

describe("SampleMusicGrid, offline", () => {
  it("shows the offline notice, disabling a card not already on this device", async () => {
    const { target } = mountGrid(previewWith({ network: new FakeNetwork(false) }));
    await settled();

    expect(target.querySelector(".notice")?.textContent).toContain("You are offline");
    const card = cardFor(target, "Hold the Frame");
    expect(card.classList.contains("disabled")).toBe(true);
    expect(card.querySelector<HTMLButtonElement>(".add")?.disabled).toBe(true);
    expect(card.querySelector(".status")?.textContent).toBe("Needs a connection");
    // The play button is withheld from a disabled card altogether.
    expect(card.querySelector(".play")).toBeNull();
  });

  it("leaves a track already on this device enabled, marked On this device", async () => {
    const { target } = mountGrid(
      previewWith({
        network: new FakeNetwork(false),
        hasMusic: (id) => Promise.resolve(id === sampleMediaId("hold-the-frame")),
      }),
    );

    await vi.waitFor(() => {
      flushSync();
      expect(cardFor(target, "Hold the Frame").classList.contains("disabled")).toBe(false);
    });
    const card = cardFor(target, "Hold the Frame");
    expect(card.querySelector<HTMLButtonElement>(".add")?.disabled).toBe(false);
    expect(card.querySelector(".status")?.textContent).toBe("On this device");
  });

  it("still lets an already-added track be removed, even disabled", async () => {
    const { target, toggled } = mountGrid(
      previewWith({ network: new FakeNetwork(false) }),
      () => true,
    );
    await settled();

    const add = cardFor(target, "Hold the Frame").querySelector<HTMLButtonElement>(".add");
    expect(add?.disabled).toBe(false);
    add?.click();

    expect(toggled.map((track) => track.id)).toEqual(["hold-the-frame"]);
  });
});
