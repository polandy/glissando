import { describe, expect, it } from "vitest";
import type { SampleTrack } from "../../sample-music/sample-tracks";
import type { SampleSongPickPorts } from "../sample-music/sample-song-pick";
import { intakeWith } from "./testing/song-intake-fixtures";

const track: SampleTrack = {
  id: "hold-the-frame",
  title: "Hold the Frame",
  durationMs: 175_099,
  bytes: 8,
  sha256: "unchecked: no download in this file runs to its end",
};

type Response = { ok: boolean; status: number; body: ReadableStream<Uint8Array> | null };

/** One download each call, answered by hand; an abort is only recorded, never answered. */
function heldDownloads() {
  const downloads: { signal: AbortSignal | undefined; respond: (response: Response) => void }[] =
    [];
  const starts: (() => void)[] = [];
  return {
    downloads,
    /** Resolves once the next download has started. */
    nextStarted: (): Promise<void> => new Promise((resolve) => starts.push(resolve)),
    fetch: ((_url: string, init: { readonly signal?: AbortSignal }) =>
      new Promise((respond) => {
        downloads.push({ signal: init.signal, respond });
        starts.shift()?.();
      })) as SampleSongPickPorts["fetch"],
  };
}

/** A body that delivers half the track, then holds; resolves `halfRead` once that half is in. */
function halfBody() {
  let markHalfRead: () => void = () => undefined;
  const halfRead = new Promise<void>((resolve) => (markHalfRead = resolve));
  let pulls = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1;
      if (pulls === 1) {
        controller.enqueue(new Uint8Array(track.bytes / 2));
        return;
      }
      // The reader asks again only after it reported the first half's progress.
      markHalfRead();
      return new Promise<void>(() => undefined);
    },
  });
  return { body, halfRead };
}

/** A body whose first half is held until `deliver()`; `pulled` resolves once it is asked for. */
function gatedBody() {
  let markPulled: () => void = () => undefined;
  const pulled = new Promise<void>((resolve) => (markPulled = resolve));
  let deliver: () => void = () => undefined;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      markPulled();
      return new Promise<void>((resolve) => {
        deliver = () => {
          controller.enqueue(new Uint8Array(track.bytes / 2));
          resolve();
        };
      });
    },
  });
  return { body, pulled, deliver: () => deliver() };
}

const downloadingRow = {
  kind: "downloadingSample",
  trackId: "hold-the-frame",
  title: "Hold the Frame",
  progress: 0,
};

describe("SongIntake, a sample track removed and added again", () => {
  it("keeps the new download's progress and abort once the removed download settles", async () => {
    const held = heldDownloads();
    const { intake, sampleShown } = intakeWith({
      sampleMusic: {
        baseUrl: "https://assets.example/music/",
        fetch: held.fetch,
        hasMusic: () => Promise.resolve(false),
        musicBlob: () => Promise.reject(new Error("not stored")),
      },
    });

    const firstStarted = held.nextStarted();
    const firstAdd = intake.addSampleTrack(track);
    await firstStarted;
    intake.removeSampleTrack(track.id);
    const secondStarted = held.nextStarted();
    void intake.addSampleTrack(track);
    await secondStarted;
    const [removed, current] = held.downloads;

    removed?.respond({ ok: false, status: 500, body: null });
    await firstAdd;
    const { body, halfRead } = halfBody();
    current?.respond({ ok: true, status: 200, body });
    await halfRead;

    expect(removed?.signal?.aborted).toBe(true);
    expect(sampleShown.at(-1)).toEqual([
      {
        kind: "downloadingSample",
        trackId: "hold-the-frame",
        title: "Hold the Frame",
        progress: 0.5,
      },
    ]);
    expect(current?.signal?.aborted).toBe(false);
    intake.removeSampleTrack(track.id);
    expect(current?.signal?.aborted).toBe(true);
    expect(sampleShown.at(-1)).toEqual([]);
  });

  it("keeps the removed download's late progress off the new download's row", async () => {
    const held = heldDownloads();
    const { intake, sampleShown } = intakeWith({
      sampleMusic: {
        baseUrl: "https://assets.example/music/",
        fetch: held.fetch,
        hasMusic: () => Promise.resolve(false),
        musicBlob: () => Promise.reject(new Error("not stored")),
      },
    });
    const firstStarted = held.nextStarted();
    const firstAdd = intake.addSampleTrack(track);
    await firstStarted;
    const removedBody = gatedBody();
    held.downloads[0]?.respond({ ok: true, status: 200, body: removedBody.body });
    await removedBody.pulled;

    intake.removeSampleTrack(track.id);
    const secondStarted = held.nextStarted();
    void intake.addSampleTrack(track);
    await secondStarted;
    removedBody.deliver();
    await firstAdd;

    expect(sampleShown.at(-1)).toEqual([downloadingRow]);
  });

  it("keeps the new download's row when the removed one fails late", async () => {
    const held = heldDownloads();
    let failStore: () => void = () => undefined;
    let markStoreStarted: () => void = () => undefined;
    const storeStarted = new Promise<void>((resolve) => (markStoreStarted = resolve));
    const onDevice = [true, false];
    const { intake, sampleShown, errors } = intakeWith({
      sampleMusic: {
        baseUrl: "https://assets.example/music/",
        fetch: held.fetch,
        hasMusic: () => Promise.resolve(onDevice.shift() ?? false),
        musicBlob: () => Promise.resolve(new Blob([new Uint8Array(track.bytes)])),
      },
      storage: {
        store: () => Promise.reject(new Error("no plain song expected in this test")),
        storeSample: () => {
          markStoreStarted();
          return new Promise((_resolve, reject) => (failStore = () => reject(new Error("full"))));
        },
      },
    });
    const firstAdd = intake.addSampleTrack(track);
    await storeStarted;

    intake.removeSampleTrack(track.id);
    const secondStarted = held.nextStarted();
    void intake.addSampleTrack(track);
    await secondStarted;
    failStore();
    await firstAdd;

    expect(errors).toEqual([]);
    expect(sampleShown.at(-1)).toEqual([downloadingRow]);
  });
});
