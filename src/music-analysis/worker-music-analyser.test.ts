import { describe, expect, it } from "vitest";
import {
  MusicAnalyserGoneError,
  MusicUndecodableError,
  type MusicAnalysis,
} from "../library/music-analyser";
import type { AnalysisReply, AnalysisRequest } from "./analysis-worker-protocol";
import type { DecodedMusic } from "./decode-music-full-rate";
import {
  MusicAnalysisError,
  WorkerMusicAnalyser,
  type AnalysisWorker,
} from "./worker-music-analyser";

const DRUMS: MusicAnalysis = {
  beats: { kind: "beats", beatsMs: [500, 1000], beatsPerMinute: 120 },
  loudness: { blockMeanSquares: new Float32Array([0.01]), hopPeaks: new Float32Array([0.5]) },
};
const QUIET_BALLAD: MusicAnalysis = {
  beats: { kind: "none" },
  loudness: { blockMeanSquares: new Float32Array([0.001]), hopPeaks: new Float32Array([0.1]) },
};
const SAMPLE_RATE = 48_000;

/** Stands in for the worker: records requests, replies and fails only when the test says so. */
class FakeAnalysisWorker implements AnalysisWorker {
  readonly requests: AnalysisRequest[] = [];
  readonly transfers: Transferable[][] = [];
  onmessage: ((event: MessageEvent<AnalysisReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  #waiting: (() => void)[] = [];

  postMessage(request: AnalysisRequest, transfer: Transferable[]): void {
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

  reply(reply: AnalysisReply): void {
    this.onmessage?.(new MessageEvent("message", { data: reply }));
  }

  answer(index: number, analysis: MusicAnalysis): void {
    this.reply({ id: this.requestAt(index).id, kind: "found", analysis });
  }

  crash(): void {
    this.onerror?.(new ErrorEvent("error"));
  }

  unreadableReply(): void {
    this.onmessageerror?.(new MessageEvent("messageerror"));
  }

  requestAt(index: number): AnalysisRequest {
    const request = this.requests[index];
    if (request === undefined) throw new Error(`no request ${index}; ${this.requests.length} sent`);
    return request;
  }
}

/** Decodes a file whose text is a number to that many stereo samples; anything else cannot be decoded. */
async function decodeFake(music: Blob): Promise<DecodedMusic> {
  const length = Number(await music.text());
  if (!Number.isInteger(length)) throw new Error("not music");
  return {
    channels: [new Float32Array(length), new Float32Array(length)],
    sampleRate: SAMPLE_RATE,
  };
}

/** The analyser, every worker it started, and the first of them once started. */
function analyserWithFakeWorker(): {
  analyser: WorkerMusicAnalyser;
  workers: FakeAnalysisWorker[];
  firstWorker: Promise<FakeAnalysisWorker>;
} {
  const workers: FakeAnalysisWorker[] = [];
  const first = Promise.withResolvers<FakeAnalysisWorker>();
  const analyser = new WorkerMusicAnalyser(decodeFake, () => {
    const worker = new FakeAnalysisWorker();
    workers.push(worker);
    first.resolve(worker);
    return worker;
  });
  return { analyser, workers, firstWorker: first.promise };
}

describe("WorkerMusicAnalyser", () => {
  it("starts no worker before the first analysis", () => {
    const { workers } = analyserWithFakeWorker();

    expect(workers).toHaveLength(0);
  });

  it("decodes on its side, hands the channels over to the worker and resolves with its answer", async () => {
    const { analyser, firstWorker } = analyserWithFakeWorker();

    const analysis = analyser.analyse(new Blob(["4"]));
    const worker = await firstWorker;
    await worker.received(1);
    const request = worker.requestAt(0);
    expect(request.channels).toHaveLength(2);
    expect(request.channels[0]).toHaveLength(4);
    expect(request.sampleRate).toBe(SAMPLE_RATE);
    expect(worker.transfers[0]).toEqual(request.channels.map((channel) => channel.buffer));
    worker.answer(0, DRUMS);

    await expect(analysis).resolves.toEqual(DRUMS);
  });

  it("matches replies to requests by id, whatever order they arrive in", async () => {
    const { analyser, workers, firstWorker } = analyserWithFakeWorker();
    const first = analyser.analyse(new Blob(["1"]));
    const second = analyser.analyse(new Blob(["2"]));
    const worker = await firstWorker;
    await worker.received(2);

    const byLength = (length: number) =>
      worker.requests.findIndex((r) => r.channels[0]?.length === length);
    worker.answer(byLength(2), QUIET_BALLAD);
    worker.answer(byLength(1), DRUMS);

    await expect(first).resolves.toEqual(DRUMS);
    await expect(second).resolves.toEqual(QUIET_BALLAD);
    expect(workers).toHaveLength(1);
  });

  it("rejects music it cannot decode as undecodable, without asking the worker", async () => {
    const { analyser, firstWorker } = analyserWithFakeWorker();

    const undecodable = analyser.analyse(new Blob(["not music"]));
    await expect(undecodable).rejects.toThrow(MusicUndecodableError);
    await expect(undecodable).rejects.toHaveProperty(
      "cause.message",
      expect.stringContaining("not music"),
    );
    const fine = analyser.analyse(new Blob(["3"]));
    const worker = await firstWorker;
    await worker.received(1);
    worker.answer(0, QUIET_BALLAD);

    await expect(fine).resolves.toEqual(QUIET_BALLAD);
    expect(worker.requests).toHaveLength(1);
  });

  it("rejects the one analysis the worker reports as failed", async () => {
    const { analyser, firstWorker } = analyserWithFakeWorker();
    const broken = analyser.analyse(new Blob(["1"]));
    const worker = await firstWorker;
    await worker.received(1);

    worker.reply({ id: worker.requestAt(0).id, kind: "failed", message: "no samples" });

    await expect(broken).rejects.toThrow(MusicAnalysisError);
    await expect(broken).rejects.toThrow("no samples");
  });

  it("rejects every pending analysis when the worker crashes, and later ones at once", async () => {
    const { analyser, firstWorker } = analyserWithFakeWorker();
    const first = analyser.analyse(new Blob(["1"]));
    const worker = await firstWorker;
    await worker.received(1);

    worker.crash();

    await expect(first).rejects.toThrow(MusicAnalyserGoneError);
    await expect(analyser.analyse(new Blob(["2"]))).rejects.toThrow(MusicAnalyserGoneError);
    expect(worker.requests).toHaveLength(1);
  });

  it("is gone for good once a reply of the worker cannot be read", async () => {
    const { analyser, firstWorker } = analyserWithFakeWorker();
    const first = analyser.analyse(new Blob(["1"]));
    const worker = await firstWorker;
    await worker.received(1);

    worker.unreadableReply();

    await expect(first).rejects.toThrow(MusicAnalyserGoneError);
    await expect(analyser.analyse(new Blob(["2"]))).rejects.toThrow(MusicAnalyserGoneError);
    expect(worker.requests).toHaveLength(1);
  });
});
