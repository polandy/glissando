import { describe, expect, it } from "vitest";
import { LoudnessMeterGoneError, MusicUnmeasurableError } from "../library/loudness-meter";
import type { MusicLoudness } from "./measure-loudness";
import type { LoudnessReply, LoudnessRequest } from "./loudness-worker-protocol";
import {
  LoudnessMeasurementError,
  WorkerLoudnessMeter,
  type DecodedMusic,
  type LoudnessWorker,
} from "./worker-loudness-meter";

const MEASURED: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.01]),
  hopPeaks: new Float32Array([0.5]),
};
const QUIET: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.001]),
  hopPeaks: new Float32Array([0.1]),
};
const SAMPLE_RATE = 44_100;

/** Stands in for the worker: records requests, replies and fails only when the test says so. */
class FakeLoudnessWorker implements LoudnessWorker {
  readonly requests: LoudnessRequest[] = [];
  readonly transfers: Transferable[][] = [];
  onmessage: ((event: MessageEvent<LoudnessReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  #waiting: (() => void)[] = [];

  postMessage(request: LoudnessRequest, transfer: Transferable[]): void {
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

  reply(reply: LoudnessReply): void {
    this.onmessage?.(new MessageEvent("message", { data: reply }));
  }

  answer(index: number, loudness: MusicLoudness): void {
    this.reply({ id: this.requestAt(index).id, kind: "found", loudness });
  }

  crash(): void {
    this.onerror?.(new ErrorEvent("error"));
  }

  requestAt(index: number): LoudnessRequest {
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

/** The meter, every worker it started, and the first of them once started. */
function meterWithFakeWorker(): {
  meter: WorkerLoudnessMeter;
  workers: FakeLoudnessWorker[];
  firstWorker: Promise<FakeLoudnessWorker>;
} {
  const workers: FakeLoudnessWorker[] = [];
  const first = Promise.withResolvers<FakeLoudnessWorker>();
  const meter = new WorkerLoudnessMeter(decodeFake, () => {
    const worker = new FakeLoudnessWorker();
    workers.push(worker);
    first.resolve(worker);
    return worker;
  });
  return { meter, workers, firstWorker: first.promise };
}

describe("WorkerLoudnessMeter", () => {
  it("starts no worker before the first measurement", () => {
    const { workers } = meterWithFakeWorker();

    expect(workers).toHaveLength(0);
  });

  it("decodes on its side, hands the channels over to the worker and resolves with its answer", async () => {
    const { meter, firstWorker } = meterWithFakeWorker();

    const measurement = meter.measure(new Blob(["4"]));
    const worker = await firstWorker;
    await worker.received(1);
    const request = worker.requestAt(0);
    expect(request.channels).toHaveLength(2);
    expect(request.channels[0]).toHaveLength(4);
    expect(request.sampleRate).toBe(SAMPLE_RATE);
    expect(worker.transfers[0]).toEqual(request.channels.map((channel) => channel.buffer));
    worker.answer(0, MEASURED);

    await expect(measurement).resolves.toEqual(MEASURED);
  });

  it("matches replies to requests by id, whatever order they arrive in", async () => {
    const { meter, workers, firstWorker } = meterWithFakeWorker();
    const first = meter.measure(new Blob(["1"]));
    const second = meter.measure(new Blob(["2"]));
    const worker = await firstWorker;
    await worker.received(2);

    const byLength = (length: number) =>
      worker.requests.findIndex((r) => r.channels[0]?.length === length);
    worker.answer(byLength(2), QUIET);
    worker.answer(byLength(1), MEASURED);

    await expect(first).resolves.toEqual(MEASURED);
    await expect(second).resolves.toEqual(QUIET);
    expect(workers).toHaveLength(1);
  });

  it("rejects music it cannot decode as unmeasurable, without asking the worker", async () => {
    const { meter, firstWorker } = meterWithFakeWorker();

    const unmeasurable = meter.measure(new Blob(["not music"]));
    await expect(unmeasurable).rejects.toThrow(MusicUnmeasurableError);
    await expect(unmeasurable).rejects.toHaveProperty(
      "cause.message",
      expect.stringContaining("not music"),
    );
    const fine = meter.measure(new Blob(["3"]));
    const worker = await firstWorker;
    await worker.received(1);
    worker.answer(0, QUIET);

    await expect(fine).resolves.toEqual(QUIET);
    expect(worker.requests).toHaveLength(1);
  });

  it("rejects the one measurement the worker reports as failed", async () => {
    const { meter, firstWorker } = meterWithFakeWorker();
    const broken = meter.measure(new Blob(["1"]));
    const worker = await firstWorker;
    await worker.received(1);

    worker.reply({ id: worker.requestAt(0).id, kind: "failed", message: "no samples" });

    await expect(broken).rejects.toThrow(LoudnessMeasurementError);
    await expect(broken).rejects.toThrow("no samples");
  });

  it("rejects every pending measurement when the worker crashes, and later ones at once", async () => {
    const { meter, firstWorker } = meterWithFakeWorker();
    const first = meter.measure(new Blob(["1"]));
    const worker = await firstWorker;
    await worker.received(1);

    worker.crash();

    await expect(first).rejects.toThrow(LoudnessMeterGoneError);
    await expect(meter.measure(new Blob(["2"]))).rejects.toThrow(LoudnessMeterGoneError);
    expect(worker.requests).toHaveLength(1);
  });
});
