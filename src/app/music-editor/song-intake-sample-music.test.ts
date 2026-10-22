import { describe, expect, it } from "vitest";
import { sha256 } from "../../sample-music/sha256";
import { sampleMediaId, type SampleTrack } from "../../sample-music/sample-tracks";
import type { SampleSongPickPorts } from "../sample-music/sample-song-pick";
import { intakeWith } from "./testing/song-intake-fixtures";

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

/** A download the test drives by hand: starts, then is told to succeed or fail. */
function heldDownload() {
  let resolve: (result: {
    ok: boolean;
    status: number;
    body: ReadableStream<Uint8Array> | null;
  }) => void = () => undefined;
  let signal: AbortSignal | undefined;
  let markStarted: () => void = () => undefined;
  const started = new Promise<void>((markResolve) => (markStarted = markResolve));
  const body = (): ReadableStream<Uint8Array> =>
    new ReadableStream({
      start(controller) {
        controller.enqueue(SAMPLE_BYTES);
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
        if (signal?.aborted) {
          rej(new Error("aborted"));
          return;
        }
        signal?.addEventListener("abort", () => rej(new Error("aborted")));
      });
    }) as SampleSongPickPorts["fetch"],
    respond: () => resolve({ ok: true, status: 200, body: body() }),
    failHttp: () => resolve({ ok: false, status: 500, body: null }),
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

describe("SongIntake, sample music", () => {
  it("reuses the device copy of a track already on this device, without downloading", async () => {
    const stored = new Blob(["device copy"], { type: "audio/mpeg" });
    let fetched = false;
    const { intake, editor, log } = intakeWith({
      sampleMusic: sampleMusicPorts({
        hasMusic: (id) => Promise.resolve(id === sampleMediaId(track.id)),
        musicBlob: () => Promise.resolve(stored),
        fetch: () => {
          fetched = true;
          return Promise.reject(new Error("must not fetch an on-device track"));
        },
      }),
    });

    await intake.addSampleTrack(track);

    expect(fetched).toBe(false);
    expect(editor.added).toEqual([
      [
        {
          id: sampleMediaId("hold-the-frame"),
          fileName: "Hold the Frame.mp3",
          durationMs: 175_099,
          mimeType: "audio/mpeg",
          sampleTrack: "hold-the-frame",
        },
      ],
    ]);
    expect(log).toContain(
      `storeSample Hold the Frame.mp3 as ${sampleMediaId("hold-the-frame")} alreadyStored=true`,
    );
  });

  it("downloads a track not on this device, reporting its progress, then adds it", async () => {
    const download = heldDownload();
    const { intake, editor, sampleShown, log } = intakeWith({
      sampleMusic: sampleMusicPorts({ fetch: download.fetch }),
    });

    const added = intake.addSampleTrack(track);
    await download.started;

    expect(sampleShown.at(-1)).toEqual([
      {
        kind: "downloadingSample",
        trackId: "hold-the-frame",
        title: "Hold the Frame",
        progress: 0,
      },
    ]);
    download.respond();
    await added;

    expect(editor.added[0]?.[0]).toMatchObject({
      fileName: "Hold the Frame.mp3",
      sampleTrack: "hold-the-frame",
    });
    expect(log).toContain(
      `storeSample Hold the Frame.mp3 as ${sampleMediaId("hold-the-frame")} alreadyStored=false`,
    );
    expect(sampleShown.at(-1)).toEqual([]);
  });

  it("turns a failed download into a failed row, and offers Add again", async () => {
    const download = heldDownload();
    const { intake, editor, sampleShown } = intakeWith({
      sampleMusic: sampleMusicPorts({ fetch: download.fetch }),
    });

    const added = intake.addSampleTrack(track);
    await download.started;
    download.failHttp();
    await added;

    expect(sampleShown.at(-1)).toEqual([
      { kind: "failedSampleDownload", trackId: "hold-the-frame", title: "Hold the Frame" },
    ]);
    expect(editor.added).toEqual([]);
    expect(intake.isSampleTrackAdded("hold-the-frame")).toBe(false);
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
    const { intake, sampleShown } = intakeWith({ sampleMusic: sampleMusicPorts({ fetch }) });

    const firstStarted = started();
    const firstAdd = intake.addSampleTrack(track);
    await firstStarted;
    pending.shift()?.({ ok: false, status: 500, body: null });
    await firstAdd;
    expect(sampleShown.at(-1)).toEqual([
      { kind: "failedSampleDownload", trackId: "hold-the-frame", title: "Hold the Frame" },
    ]);

    const secondStarted = started();
    void intake.addSampleTrack(track);
    await secondStarted;

    expect(sampleShown.at(-1)).toEqual([
      {
        kind: "downloadingSample",
        trackId: "hold-the-frame",
        title: "Hold the Frame",
        progress: 0,
      },
    ]);
  });

  it("does not add a track already downloading a second time", async () => {
    const download = heldDownload();
    const { intake, sampleShown } = intakeWith({
      sampleMusic: sampleMusicPorts({ fetch: download.fetch }),
    });

    const first = intake.addSampleTrack(track);
    await download.started;
    void intake.addSampleTrack(track);

    expect(sampleShown.at(-1)).toHaveLength(1);
    download.respond();
    await first;
  });

  it("keeps a sample track removed while its store write is pending out of the playlist", async () => {
    const download = heldDownload();
    let markStoreStarted: () => void = () => undefined;
    const storeStarted = new Promise<void>((resolve) => (markStoreStarted = resolve));
    let resolveStore: (() => void) | undefined;
    const released: string[] = [];
    const { intake, editor, sampleShown } = intakeWith({
      sampleMusic: sampleMusicPorts({ fetch: download.fetch }),
      storage: {
        store: () => Promise.reject(new Error("no plain song expected in this test")),
        storeSample: (_file, mediaId) => {
          markStoreStarted();
          return new Promise((resolve) => {
            resolveStore = () =>
              resolve({
                id: mediaId,
                release: () => {
                  released.push(mediaId);
                  return Promise.resolve();
                },
              });
          });
        },
      },
    });

    const added = intake.addSampleTrack(track);
    await download.started;
    download.respond();
    await storeStarted;

    intake.removeSampleTrack(track.id);
    resolveStore?.();
    await added;

    expect(editor.added).toEqual([]);
    expect(released).toEqual([sampleMediaId(track.id)]);
    expect(sampleShown.at(-1)).toEqual([]);
  });

  it("aborts a track's download when its row is removed, and offers it again", async () => {
    const download = heldDownload();
    const { intake, editor, sampleShown } = intakeWith({
      sampleMusic: sampleMusicPorts({ fetch: download.fetch }),
    });
    const added = intake.addSampleTrack(track);
    await download.started;

    intake.removeSampleTrack("hold-the-frame");
    await added;

    expect(download.aborted()).toBe(true);
    expect(sampleShown.at(-1)).toEqual([]);
    expect(editor.added).toEqual([]);
    expect(intake.isSampleTrackAdded("hold-the-frame")).toBe(false);
  });
});
