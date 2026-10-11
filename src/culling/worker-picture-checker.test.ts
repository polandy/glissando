import { describe, expect, it } from "vitest";
import type { CheckReply, CheckRequest } from "./check-worker-protocol";
import { PictureCheckError, PictureCheckerGoneError, type PictureMeasure } from "./picture-checker";
import { WorkerPictureChecker, type CheckWorker } from "./worker-picture-checker";

const MEASURE: PictureMeasure = { sharpness: 420, hash: 0xf0f0n };

/** Stands in for the worker: records requests, replies and fails only when the test says so. */
class FakeCheckWorker implements CheckWorker {
  readonly requests: CheckRequest[] = [];
  onmessage: ((event: MessageEvent<CheckReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  postMessage(request: CheckRequest): void {
    this.requests.push(request);
  }

  reply(reply: CheckReply): void {
    this.onmessage?.(new MessageEvent("message", { data: reply }));
  }

  idAt(index: number): number {
    const request = this.requests[index];
    if (request === undefined) throw new Error(`no request ${index}; ${this.requests.length} sent`);
    return request.id;
  }
}

function checkerWithFakeWorker(): { checker: WorkerPictureChecker; workers: FakeCheckWorker[] } {
  const workers: FakeCheckWorker[] = [];
  const checker = new WorkerPictureChecker(() => {
    const worker = new FakeCheckWorker();
    workers.push(worker);
    return worker;
  });
  return { checker, workers };
}

function onlyWorker(workers: readonly FakeCheckWorker[]): FakeCheckWorker {
  expect(workers).toHaveLength(1);
  const [worker] = workers;
  if (worker === undefined) throw new Error("no worker started");
  return worker;
}

describe("WorkerPictureChecker", () => {
  it("starts no worker before the first measurement", () => {
    expect(checkerWithFakeWorker().workers).toHaveLength(0);
  });

  it("sends the thumbnail to one worker and resolves each measurement with its own reply", async () => {
    const { checker, workers } = checkerWithFakeWorker();
    const thumbnail = new Blob(["first"]);
    const first = checker.measure(thumbnail);
    const second = checker.measure(new Blob(["second"]));
    const worker = onlyWorker(workers);

    worker.reply({ id: worker.idAt(1), kind: "measured", measure: { sharpness: 1, hash: 1n } });
    worker.reply({ id: worker.idAt(0), kind: "measured", measure: MEASURE });

    expect(worker.requests[0]?.thumbnail).toBe(thumbnail);
    await expect(first).resolves.toEqual(MEASURE);
    await expect(second).resolves.toEqual({ sharpness: 1, hash: 1n });
  });

  it("rejects a thumbnail the worker could not measure, and goes on with the next", async () => {
    const { checker, workers } = checkerWithFakeWorker();
    const failing = checker.measure(new Blob(["not a picture"]));
    const worker = onlyWorker(workers);
    worker.reply({ id: worker.idAt(0), kind: "failed", message: "undecodable" });
    const next = checker.measure(new Blob(["picture"]));
    worker.reply({ id: worker.idAt(1), kind: "measured", measure: MEASURE });

    await expect(failing).rejects.toThrow(PictureCheckError);
    await expect(next).resolves.toEqual(MEASURE);
  });

  it("rejects every pending and later measurement once the worker crashed", async () => {
    const { checker, workers } = checkerWithFakeWorker();
    const pending = checker.measure(new Blob(["picture"]));

    onlyWorker(workers).onerror?.(new ErrorEvent("error"));

    await expect(pending).rejects.toThrow(PictureCheckerGoneError);
    await expect(checker.measure(new Blob(["later"]))).rejects.toThrow(PictureCheckerGoneError);
    expect(workers).toHaveLength(1);
  });

  it("is gone once a reply cannot be read", async () => {
    const { checker, workers } = checkerWithFakeWorker();
    const pending = checker.measure(new Blob(["picture"]));

    onlyWorker(workers).onmessageerror?.(new MessageEvent("messageerror"));

    await expect(pending).rejects.toThrow(PictureCheckerGoneError);
  });
});
