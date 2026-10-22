import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { sha256 } from "../../sample-music/sha256";
import { sampleMediaId, type SampleTrack } from "../../sample-music/sample-tracks";
import type { SampleSongPickPorts } from "../sample-music/sample-song-pick";
import { chosenSongs } from "./import-session";
import {
  LoggingStore,
  choicesOf,
  pictureFile,
  sessionWith,
} from "./testing/import-session-fixtures";

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

/** A download the test drives by hand: starts, then is told to succeed, fail or stay open. */
function heldDownload() {
  let resolve: (result: {
    ok: boolean;
    status: number;
    body: ReadableStream<Uint8Array> | null;
  }) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  let signal: AbortSignal | undefined;
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
    fetch: ((_url: string, init: { readonly signal?: AbortSignal }) => {
      signal = init.signal;
      markStarted();
      return new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
    }) as SampleSongPickPorts["fetch"],
    respond: () => resolve({ ok: true, status: 200, body: body() }),
    failHttp: () => resolve({ ok: false, status: 500, body: null }),
    failNetwork: () => reject(new Error("network down")),
    aborted: () => signal?.aborted === true,
  };
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

async function sessionWithPictures(store: MemoryLibraryStore, sampleMusic: SampleSongPickPorts) {
  const setup = sessionWith(store, { sampleMusic });
  setup.session.addPictures([pictureFile("one.jpg", "2025-07-01T10:00:00Z")]);
  await setup.session.intake.settled();
  return setup;
}

describe("ImportSession, sample music", () => {
  it("reuses the device copy of a track already on this device, without downloading", async () => {
    const store = new LoggingStore();
    const stored = new Blob(["device copy"], { type: "audio/mpeg" });
    const { session } = await sessionWithPictures(
      store,
      sampleMusicPorts({
        hasMusic: (id) => Promise.resolve(id === sampleMediaId(track.id)),
        musicBlob: () => Promise.resolve(stored),
      }),
    );

    await session.addSampleTrack(track);

    expect(chosenSongs(choicesOf(session))).toMatchObject([
      { kind: "chosen", pickedName: "Hold the Frame.mp3", sample: { trackId: "hold-the-frame" } },
    ]);
    expect(store.log.filter((entry) => entry.startsWith("music "))).toEqual([]);
  });

  it("downloads a track not on this device, reporting its progress", async () => {
    const download = heldDownload();
    const { session } = await sessionWithPictures(
      new MemoryLibraryStore(),
      sampleMusicPorts({ fetch: download.fetch }),
    );

    const added = session.addSampleTrack(track);
    await download.started;

    expect(choicesOf(session).songs).toEqual([
      {
        key: 1,
        kind: "downloadingSample",
        trackId: "hold-the-frame",
        title: "Hold the Frame",
        progress: 0,
      },
    ]);
    download.respond();
    await added;

    expect(chosenSongs(choicesOf(session))).toMatchObject([
      { kind: "chosen", sample: { trackId: "hold-the-frame", alreadyStored: false } },
    ]);
  });

  it("stores a downloaded track under its fixed media id when the slideshow is created", async () => {
    const download = heldDownload();
    const store = new LoggingStore();
    const { session } = await sessionWithPictures(
      store,
      sampleMusicPorts({ fetch: download.fetch }),
    );
    const added = session.addSampleTrack(track);
    await download.started;
    download.respond();
    await added;

    const created = await session.create("de");

    expect(created.songs[0]).toMatchObject({
      id: sampleMediaId("hold-the-frame"),
      sampleTrack: "hold-the-frame",
    });
    expect(await (await store.musicBlob(sampleMediaId("hold-the-frame"))).text()).toBe(
      "sample bytes",
    );
  });

  it("turns a failed download into a failed row and offers Add again", async () => {
    const download = heldDownload();
    const { session } = await sessionWithPictures(
      new MemoryLibraryStore(),
      sampleMusicPorts({ fetch: download.fetch }),
    );
    const added = session.addSampleTrack(track);
    await download.started;
    download.failHttp();
    await added;

    expect(choicesOf(session).songs).toEqual([
      { key: 1, kind: "failedSampleDownload", trackId: "hold-the-frame", title: "Hold the Frame" },
    ]);
    expect(session.isSampleTrackAdded("hold-the-frame")).toBe(false);
  });

  it("replaces a failed row with a new download on retry, leaving only one row", async () => {
    type Response = { ok: boolean; status: number; body: ReadableStream<Uint8Array> | null };
    const pending: ((response: Response) => void)[] = [];
    const starts: (() => void)[] = [];
    const started = (): Promise<void> => new Promise((resolve) => starts.push(resolve));
    const fetch: SampleSongPickPorts["fetch"] = () => {
      starts.shift()?.();
      return new Promise((resolve) => pending.push(resolve));
    };
    const { session } = await sessionWithPictures(
      new MemoryLibraryStore(),
      sampleMusicPorts({ fetch }),
    );

    const firstStarted = started();
    const firstAdd = session.addSampleTrack(track);
    await firstStarted;
    pending.shift()?.({ ok: false, status: 500, body: null });
    await firstAdd;
    expect(choicesOf(session).songs).toEqual([
      { key: 1, kind: "failedSampleDownload", trackId: "hold-the-frame", title: "Hold the Frame" },
    ]);

    const secondStarted = started();
    void session.addSampleTrack(track);
    await secondStarted;

    expect(choicesOf(session).songs).toEqual([
      {
        key: 2,
        kind: "downloadingSample",
        trackId: "hold-the-frame",
        title: "Hold the Frame",
        progress: 0,
      },
    ]);
  });

  it("does not add a track already in the choices a second time", async () => {
    const download = heldDownload();
    const { session } = await sessionWithPictures(
      new MemoryLibraryStore(),
      sampleMusicPorts({ fetch: download.fetch }),
    );

    const first = session.addSampleTrack(track);
    await download.started;
    void session.addSampleTrack(track);

    expect(choicesOf(session).songs).toHaveLength(1);
    download.respond();
    await first;
    expect(choicesOf(session).songs).toHaveLength(1);
  });

  it("aborts a track's download when its downloading row is removed", async () => {
    const download = heldDownload();
    const { session } = await sessionWithPictures(
      new MemoryLibraryStore(),
      sampleMusicPorts({ fetch: download.fetch }),
    );
    const added = session.addSampleTrack(track);
    await download.started;

    session.removeSampleTrack("hold-the-frame");
    download.failNetwork();
    await added;

    expect(download.aborted()).toBe(true);
    expect(choicesOf(session).songs).toEqual([]);
  });

  it("refuses to create the slideshow while a sample track is still downloading", async () => {
    const download = heldDownload();
    const { session } = await sessionWithPictures(
      new MemoryLibraryStore(),
      sampleMusicPorts({ fetch: download.fetch }),
    );
    void session.addSampleTrack(track);
    await download.started;

    await expect(session.create("de")).rejects.toThrow(/still being read|still downloading/);
  });
});
