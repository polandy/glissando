import { describe, expect, it } from "vitest";
import { BeatDetectorGoneError, MusicUndecodableError } from "../library/beat-detector";
import type { BeatReply, BeatRequest } from "./beat-worker-protocol";
import type { MusicBeats } from "./music-beats";
import {
  BeatDetectionError,
  WorkerBeatDetector,
  type BeatWorker,
  type DecodedMusic,
} from "./worker-beat-detector";

const DRUMS: MusicBeats = { kind: "beats", beatsMs: [500, 1000], beatsPerMinute: 120 };
const NONE: MusicBeats = { kind: "none" };
const SAMPLE_RATE = 11_025;

/** Stands in for the worker: records requests, replies and fails only when the test says so. */
class FakeBeatWorker implements BeatWorker {
  readonly requests: BeatRequest[] = [];
  readonly transfers: Transferable[][] = [];
  onmessage: ((event: MessageEvent<BeatReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  #waiting: (() => void)[] = [];

  postMessage(request: BeatRequest, transfer: Transferable[]): void {
    this.requests.push(request);
    this.transfers.push(transfer);
    this.#waiting.splice(0).forEach((wake) => wake());
  }

  /** Resolves once `count` requests have arrived. */
  received(count: number): Promise<void> {
    if (this.requests.length >= count) return Promise.resolve();
    return new Promise((resolve) =>
      this.#waiting.push(() => void this.received(count).then(resolve)),
    );
  }

  reply(reply: BeatReply): void {
    this.onmessage?.(new MessageEvent("message", { data: reply }));
  }

  answer(index: number, beats: MusicBeats): void {
    this.reply({ id: this.requestAt(index).id, kind: "found", beats });
  }

  crash(): void {
    this.onerror?.(new ErrorEvent("error"));
  }

  requestAt(index: number): BeatRequest {
    const request = this.requests[index];
    if (request === undefined) throw new Error(`no request ${index}; ${this.requests.length} sent`);
    return request;
  }
}

/** Decodes a file whose text is a number to that many samples; anything else cannot be decoded. */
async function decodeFake(music: Blob): Promise<DecodedMusic> {
  const length = Number(await music.text());
  if (!Number.isInteger(length)) throw new Error("not music");
  return { samples: new Float32Array(length), sampleRate: SAMPLE_RATE };
}

/** The detector, every worker it started, and the first of them once started. */
function detectorWithFakeWorker(): {
  detector: WorkerBeatDetector;
  workers: FakeBeatWorker[];
  firstWorker: Promise<FakeBeatWorker>;
} {
  const workers: FakeBeatWorker[] = [];
  const first = Promise.withResolvers<FakeBeatWorker>();
  const detector = new WorkerBeatDetector(decodeFake, () => {
    const worker = new FakeBeatWorker();
    workers.push(worker);
    first.resolve(worker);
    return worker;
  });
  return { detector, workers, firstWorker: first.promise };
}

describe("WorkerBeatDetector", () => {
  it("starts no worker before the first detection", () => {
    const { workers } = detectorWithFakeWorker();

    expect(workers).toHaveLength(0);
  });

  it("decodes on its side, hands the samples over to the worker and resolves with its answer", async () => {
    const { detector, firstWorker } = detectorWithFakeWorker();

    const detection = detector.detect(new Blob(["4"]));
    const worker = await firstWorker;
    await worker.received(1);
    const request = worker.requestAt(0);
    expect(request.samples).toHaveLength(4);
    expect(request.sampleRate).toBe(SAMPLE_RATE);
    expect(worker.transfers[0]).toEqual([request.samples.buffer]);
    worker.answer(0, DRUMS);

    await expect(detection).resolves.toEqual(DRUMS);
  });

  it("matches replies to requests by id, whatever order they arrive in", async () => {
    const { detector, workers, firstWorker } = detectorWithFakeWorker();
    const first = detector.detect(new Blob(["1"]));
    const second = detector.detect(new Blob(["2"]));
    const worker = await firstWorker;
    await worker.received(2);

    const byLength = (length: number) =>
      worker.requests.findIndex((r) => r.samples.length === length);
    worker.answer(byLength(2), NONE);
    worker.answer(byLength(1), DRUMS);

    await expect(first).resolves.toEqual(DRUMS);
    await expect(second).resolves.toEqual(NONE);
    expect(workers).toHaveLength(1);
  });

  it("rejects music it cannot decode as undecodable, without asking the worker", async () => {
    const { detector, firstWorker } = detectorWithFakeWorker();

    const undecodable = detector.detect(new Blob(["not music"]));
    await expect(undecodable).rejects.toThrow(MusicUndecodableError);
    await expect(undecodable).rejects.toHaveProperty(
      "cause.message",
      expect.stringContaining("not music"),
    );
    const fine = detector.detect(new Blob(["3"]));
    const worker = await firstWorker;
    await worker.received(1);
    worker.answer(0, NONE);

    await expect(fine).resolves.toEqual(NONE);
    expect(worker.requests).toHaveLength(1);
  });

  it("rejects the one detection the worker reports as failed", async () => {
    const { detector, firstWorker } = detectorWithFakeWorker();
    const broken = detector.detect(new Blob(["1"]));
    const worker = await firstWorker;
    await worker.received(1);

    worker.reply({ id: worker.requestAt(0).id, kind: "failed", message: "no samples" });

    await expect(broken).rejects.toThrow(BeatDetectionError);
    await expect(broken).rejects.toThrow("no samples");
  });

  it("rejects every pending detection when the worker crashes, and later ones at once", async () => {
    const { detector, firstWorker } = detectorWithFakeWorker();
    const first = detector.detect(new Blob(["1"]));
    const worker = await firstWorker;
    await worker.received(1);

    worker.crash();

    await expect(first).rejects.toThrow(BeatDetectorGoneError);
    await expect(detector.detect(new Blob(["2"]))).rejects.toThrow(BeatDetectorGoneError);
    expect(worker.requests).toHaveLength(1);
  });
});
