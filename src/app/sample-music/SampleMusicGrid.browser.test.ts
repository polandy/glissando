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
import type { SampleSongRow } from "./sample-song-pick";

// First 3 (the folded grid) and one from the remaining 6 (unfolded by "Show all").
const VISIBLE_TITLE = "Hold the Frame";
const HIDDEN_TITLE = "Where the Mountains Meet";
const HIDDEN_TRACK_ID: SampleTrackId = "where-the-mountains-meet";

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
  sampleRows: readonly SampleSongRow[] = [],
) {
  const toggled: SampleTrack[] = [];
  const mounted = mountWithTranslator(
    SampleMusicGrid,
    {
      preview,
      isAdded,
      onToggle: (track: SampleTrack) => toggled.push(track),
      toaster: new Toaster(new FakeScheduler()),
      sampleRows,
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

const toggleButton = (target: HTMLElement): HTMLButtonElement => {
  const button = target.querySelector<HTMLButtonElement>(".toggle");
  if (button === null) throw new Error("no toggle button");
  return button;
};

// hasTrackOnDevice resolves on a microtask per track; a flush after lets its effect settle.
async function settled(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  flushSync();
}

describe("SampleMusicGrid, folded by default", () => {
  it("shows only the first 3 cards, folding the rest behind Show all", async () => {
    const { target } = mountGrid(previewWith());
    await settled();

    expect(toggleButton(target).getAttribute("aria-expanded")).toBe("false");
    expect(toggleButton(target).textContent).toContain("Show all 9");
    expect(target.querySelector(".more")?.classList.contains("open")).toBe(false);
  });

  it("unfolds the rest on Show all, flipping to Show fewer", async () => {
    const { target } = mountGrid(previewWith());
    await settled();

    toggleButton(target).click();
    flushSync();

    expect(toggleButton(target).getAttribute("aria-expanded")).toBe("true");
    expect(toggleButton(target).textContent).toContain("Show fewer");
    expect(target.querySelector(".more")?.classList.contains("open")).toBe(true);
    expect(cardFor(target, HIDDEN_TITLE)).not.toBeNull();
  });

  it("stops a playing hidden card's preview when the block folds back over it", async () => {
    const { target } = mountGrid(previewWith());
    await settled();
    toggleButton(target).click();
    flushSync();

    const hidden = cardFor(target, HIDDEN_TITLE);
    hidden.querySelector<HTMLButtonElement>(".play")?.click();
    await vi.waitFor(() => {
      flushSync();
      expect(cardFor(target, HIDDEN_TITLE).querySelector(".bars")).not.toBeNull();
    });

    toggleButton(target).click();
    flushSync();

    expect(toggleButton(target).getAttribute("aria-expanded")).toBe("false");
    // Folding stopped the preview, so the card's playing marker is gone.
    expect(cardFor(target, HIDDEN_TITLE).querySelector(".bars")).toBeNull();
  });
});

describe("SampleMusicGrid, adding", () => {
  it("shows + as not pressed, labelled Add <title>, when not added", async () => {
    const { target } = mountGrid(previewWith());
    await settled();

    const plus = cardFor(target, VISIBLE_TITLE).querySelector<HTMLButtonElement>(".plus");
    expect(plus?.getAttribute("aria-pressed")).toBe("false");
    expect(plus?.getAttribute("aria-label")).toBe(`Add ${VISIBLE_TITLE}`);
  });

  it("shows + as pressed and ✓-styled, labelled Remove <title>, when added", async () => {
    const { target } = mountGrid(previewWith(), () => true);
    await settled();

    const plus = cardFor(target, VISIBLE_TITLE).querySelector<HTMLButtonElement>(".plus");
    expect(plus?.getAttribute("aria-pressed")).toBe("true");
    expect(plus?.getAttribute("aria-label")).toBe(`Remove ${VISIBLE_TITLE}`);
    expect(plus?.classList.contains("added")).toBe(true);
  });

  it("reports the toggled track on click", async () => {
    const { target, toggled } = mountGrid(previewWith());
    await settled();

    cardFor(target, VISIBLE_TITLE).querySelector<HTMLButtonElement>(".plus")?.click();

    expect(toggled.map((track) => track.id)).toEqual(["hold-the-frame"]);
  });
});

describe("SampleMusicGrid, downloading", () => {
  it("shows a progress ring instead of + while a track downloads", async () => {
    const rows: readonly SampleSongRow[] = [
      { kind: "downloadingSample", trackId: HIDDEN_TRACK_ID, title: HIDDEN_TITLE, progress: 0.4 },
    ];
    const { target } = mountGrid(previewWith(), () => false, rows);
    await settled();
    toggleButton(target).click();
    flushSync();

    const card = cardFor(target, HIDDEN_TITLE);
    expect(card.querySelector(".plus")).toBeNull();
    expect(card.querySelector(".ring")).not.toBeNull();
    expect(card.querySelector(".ring-value")?.textContent).toBe("40");
  });
});

describe("SampleMusicGrid, online", () => {
  it("shows no offline notice, and every card's + enabled", async () => {
    const { target } = mountGrid(previewWith());
    await settled();

    expect(target.querySelector(".notice")).toBeNull();
    const plus = cardFor(target, VISIBLE_TITLE).querySelector<HTMLButtonElement>(".plus");
    expect(plus?.disabled).toBe(false);
    expect(target.querySelector(".status")).toBeNull();
  });
});

describe("SampleMusicGrid, offline", () => {
  it("shows the offline notice, disabling a card not already on this device", async () => {
    const { target } = mountGrid(previewWith({ network: new FakeNetwork(false) }));
    await settled();

    expect(target.querySelector(".notice")?.textContent).toContain("You are offline");
    const card = cardFor(target, VISIBLE_TITLE);
    expect(card.classList.contains("disabled")).toBe(true);
    expect(card.querySelector<HTMLButtonElement>(".plus")?.disabled).toBe(true);
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
      expect(cardFor(target, VISIBLE_TITLE).classList.contains("disabled")).toBe(false);
    });
    const card = cardFor(target, VISIBLE_TITLE);
    expect(card.querySelector<HTMLButtonElement>(".plus")?.disabled).toBe(false);
    expect(card.querySelector(".status")?.textContent).toBe("On this device");
  });

  it("still lets an already-added track be removed, even disabled", async () => {
    const { target, toggled } = mountGrid(
      previewWith({ network: new FakeNetwork(false) }),
      () => true,
    );
    await settled();

    const plus = cardFor(target, VISIBLE_TITLE).querySelector<HTMLButtonElement>(".plus");
    expect(plus?.disabled).toBe(false);
    plus?.click();

    expect(toggled.map((track) => track.id)).toEqual(["hold-the-frame"]);
  });
});
