import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { NetworkStatus } from "../../immich/immich-availability";
import { sha256 } from "../../sample-music/sha256";
import {
  sampleMediaId,
  type SampleTrack,
  type SampleTrackId,
} from "../../sample-music/sample-tracks";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { createTranslator } from "../i18n/translator";
import type { SampleSongPickPorts } from "../sample-music/sample-song-pick";
import {
  SamplePreview,
  type SamplePreviewAudio,
  type SamplePreviewPorts,
} from "../sample-music/sample-preview";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { Toaster } from "../toast/toaster";
import type { ImportSession } from "./import-session";
import MusicStep from "./MusicStep.svelte";
import { withTwoPictures } from "./testing/import-session-fixtures";

const SAMPLE_BYTES = new TextEncoder().encode("sample bytes");

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const track: SampleTrack = {
  id: "hold-the-frame",
  title: "Hold the Frame",
  durationMs: 175_099,
  bytes: SAMPLE_BYTES.length,
  sha256: toBase64(sha256(SAMPLE_BYTES)),
};

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

const dummyAudio = (): SamplePreviewAudio => ({
  src: "",
  currentTime: 0,
  play: () => Promise.resolve(),
  pause: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
});

function samplePreviewWith(overrides: Partial<SamplePreviewPorts> = {}): SamplePreview {
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

function sampleMusicPorts(overrides: Partial<SampleSongPickPorts> = {}): SampleSongPickPorts {
  return {
    baseUrl: "https://assets.example/music/",
    fetch: () => Promise.reject(new Error("no download expected in this test")),
    hasMusic: () => Promise.resolve(false),
    musicBlob: () => Promise.reject(new Error("not stored")),
    ...overrides,
  };
}

/** A download the test drives by hand: starts, then is told to succeed or fail. */
function heldDownload() {
  let resolve: (result: {
    ok: boolean;
    status: number;
    body: ReadableStream<Uint8Array> | null;
  }) => void = () => undefined;
  let markStarted: () => void = () => undefined;
  const started = new Promise<void>((markResolve) => (markStarted = markResolve));
  const body = (): ReadableStream<Uint8Array> =>
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("sample bytes"));
        controller.close();
      },
    });
  return {
    started,
    fetch: (() => {
      markStarted();
      return new Promise((res) => (resolve = res));
    }) as SampleSongPickPorts["fetch"],
    respond: () => resolve({ ok: true, status: 200, body: body() }),
    failHttp: () => resolve({ ok: false, status: 500, body: null }),
  };
}

/** Resolves once `trackId` is a chosen song, as the sample grid's "+" leads to. */
function waitForChosen(session: ImportSession, trackId: SampleTrackId): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = session.choices.subscribe((next) => {
      if (next.songs.some((song) => song.kind === "chosen" && song.sample?.trackId === trackId)) {
        unsubscribe();
        resolve();
      }
    });
  });
}

/** Resolves once `trackId`'s download has failed, leaving a coral row. */
function waitForFailed(session: ImportSession, trackId: SampleTrackId): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = session.choices.subscribe((next) => {
      if (
        next.songs.some((song) => song.kind === "failedSampleDownload" && song.trackId === trackId)
      ) {
        unsubscribe();
        resolve();
      }
    });
  });
}

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

function mountStep(session: ImportSession, samplePreview?: SamplePreview): HTMLElement {
  const step = mountWithTranslator(
    MusicStep,
    {
      session,
      loadThumbnail: () => Promise.resolve(new Blob()),
      onBack: () => undefined,
      onCreate: () => undefined,
      onError: (error: unknown) => {
        throw error;
      },
      samplePreview,
      toaster: new Toaster(new FakeScheduler()),
    },
    { current: createTranslator("en") },
  );
  unmounts.push(step.destroy);
  return step.target;
}

const cardFor = (target: HTMLElement, title: string): HTMLElement => {
  const card = [...target.querySelectorAll(".card")].find(
    (candidate) => candidate.querySelector(".name")?.textContent?.trim() === title,
  );
  if (card === undefined) throw new Error(`no card for "${title}"`);
  return card as HTMLElement;
};

describe("MusicStep, sample music off", () => {
  it("shows no sample-music block, no or divider, and the soundtrack straight away", async () => {
    const { session } = await withTwoPictures();

    const target = mountStep(session);

    expect(target.querySelector(".block")).toBeNull();
    expect(target.querySelector(".or")).toBeNull();
    expect(target.querySelector(".own-title")?.textContent).toBe("Your own music");
    expect(target.querySelector(".soundtrack-empty")).not.toBeNull();
  });
});

describe("MusicStep, sample music on", () => {
  it("shows the block, the or divider and own music together, without any tab", async () => {
    const { session } = await withTwoPictures({ sampleMusic: sampleMusicPorts() });
    const target = mountStep(session, samplePreviewWith());
    flushSync();

    expect(target.querySelector('[role="tablist"]')).toBeNull();
    expect(target.querySelector(".block .grid")).not.toBeNull();
    expect(target.querySelector(".or")?.textContent).toBe("or");
    expect(target.querySelector(".own-title")?.textContent).toBe("Your own music");
  });

  it("adds a track already on this device at once, tagging the song Sample in the one list", async () => {
    const deviceId = sampleMediaId(track.id);
    const { session } = await withTwoPictures({
      sampleMusic: sampleMusicPorts({
        hasMusic: (id) => Promise.resolve(id === deviceId),
        musicBlob: () => Promise.resolve(new Blob(["device copy"], { type: "audio/mpeg" })),
      }),
    });
    const target = mountStep(session, samplePreviewWith());
    flushSync();
    const chosen = waitForChosen(session, track.id);

    cardFor(target, "Hold the Frame").querySelector<HTMLButtonElement>(".plus")?.click();
    await chosen;
    flushSync();

    expect(
      cardFor(target, "Hold the Frame").querySelector(".plus")?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(target.querySelector(".soundtrack .badge")?.textContent).toBe("Sample");

    cardFor(target, "Hold the Frame").querySelector<HTMLButtonElement>(".plus")?.click();
    flushSync();

    expect(target.querySelector(".soundtrack .badge")).toBeNull();
  });

  it("shows a downloading row with progress, then a failed row its × dismisses", async () => {
    const download = heldDownload();
    const { session } = await withTwoPictures({
      sampleMusic: sampleMusicPorts({ fetch: download.fetch }),
    });
    const target = mountStep(session, samplePreviewWith());
    flushSync();

    cardFor(target, "Hold the Frame").querySelector<HTMLButtonElement>(".plus")?.click();
    await download.started;
    flushSync();

    // The catalogue's "Downloading · {percent} %" uses non-breaking spaces (U+00A0).
    expect(target.querySelector(".soundtrack .row .name")?.textContent).toContain(
      "Downloading · 0 %",
    );

    const failed = waitForFailed(session, track.id);
    download.failHttp();
    await failed;
    flushSync();

    expect(target.querySelector(".soundtrack .row.failed .name")?.textContent).toContain(
      "Couldn't download this song",
    );
    const dismiss = [...target.querySelectorAll("button")].find((button) =>
      button.closest(".row.failed"),
    );
    dismiss?.click();
    flushSync();

    expect(target.querySelector(".soundtrack .row")).toBeNull();
  });
});
