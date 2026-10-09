import { describe, expect, it } from "vitest";
import type { PictureFocus } from "../library/picture-focus";
import type { FocusReply, FocusRequest } from "./focus-worker-protocol";
import {
  FocusDetectionError,
  WorkerFocusDetector,
  type FocusWorker,
} from "./worker-focus-detector";

const FACE: PictureFocus = { kind: "subject", box: { x: 0.1, y: 0.2, width: 0.3, height: 0.3 } };
const NONE: PictureFocus = { kind: "none" };

/** Stands in for the worker: records requests, replies and fails only when the test says so. */
class FakeFocusWorker implements FocusWorker {
  readonly requests: FocusRequest[] = [];
  onmessage: ((event: MessageEvent<FocusReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(request: FocusRequest): void {
    this.requests.push(request);
  }

  reply(reply: FocusReply): void {
    this.onmessage?.(new MessageEvent("message", { data: reply }));
  }

  answer(index: number, focus: PictureFocus): void {
    this.reply({ id: this.requestAt(index).id, kind: "found", focus });
  }

  crash(): void {
    this.onerror?.(new ErrorEvent("error"));
  }

  requestAt(index: number): FocusRequest {
    const request = this.requests[index];
    if (request === undefined) throw new Error(`no request ${index}; ${this.requests.length} sent`);
    return request;
  }
}

function detectorWithFakeWorker(): { detector: WorkerFocusDetector; workers: FakeFocusWorker[] } {
  const workers: FakeFocusWorker[] = [];
  const detector = new WorkerFocusDetector(() => {
    const worker = new FakeFocusWorker();
    workers.push(worker);
    return worker;
  });
  return { detector, workers };
}

describe("WorkerFocusDetector", () => {
  it("starts no worker before the first detection", () => {
    const { workers } = detectorWithFakeWorker();

    expect(workers).toHaveLength(0);
  });

  it("sends the thumbnail to the worker and resolves with its answer", async () => {
    const { detector, workers } = detectorWithFakeWorker();
    const thumbnail = new Blob(["thumbnail"]);

    const detection = detector.detect(thumbnail);
    const [worker] = workers;
    expect(worker?.requestAt(0).thumbnail).toBe(thumbnail);
    worker?.answer(0, FACE);

    await expect(detection).resolves.toEqual(FACE);
  });

  it("runs every detection in one worker", async () => {
    const { detector, workers } = detectorWithFakeWorker();

    const first = detector.detect(new Blob(["a"]));
    const second = detector.detect(new Blob(["b"]));
    workers[0]?.answer(0, NONE);
    workers[0]?.answer(1, NONE);
    await Promise.all([first, second]);

    expect(workers).toHaveLength(1);
    expect(workers[0]?.requests).toHaveLength(2);
  });

  it("matches replies to requests by id, whatever order they arrive in", async () => {
    const { detector, workers } = detectorWithFakeWorker();
    const first = detector.detect(new Blob(["a"]));
    const second = detector.detect(new Blob(["b"]));

    workers[0]?.answer(1, NONE);
    workers[0]?.answer(0, FACE);

    await expect(first).resolves.toEqual(FACE);
    await expect(second).resolves.toEqual(NONE);
  });

  it("rejects the one detection the worker reports as failed", async () => {
    const { detector, workers } = detectorWithFakeWorker();
    const broken = detector.detect(new Blob(["not a picture"]));
    const fine = detector.detect(new Blob(["picture"]));
    const worker = workers[0];

    worker?.reply({ id: worker.requestAt(0).id, kind: "failed", message: "cannot decode" });
    worker?.answer(1, FACE);

    await expect(broken).rejects.toThrow(FocusDetectionError);
    await expect(broken).rejects.toThrow("cannot decode");
    await expect(fine).resolves.toEqual(FACE);
  });

  it("rejects every pending detection when the worker crashes", async () => {
    const { detector, workers } = detectorWithFakeWorker();
    const first = detector.detect(new Blob(["a"]));
    const second = detector.detect(new Blob(["b"]));

    workers[0]?.crash();

    await expect(first).rejects.toThrow(FocusDetectionError);
    await expect(second).rejects.toThrow(FocusDetectionError);
  });

  it("rejects later detections at once after a crash, without asking the dead worker", async () => {
    const { detector, workers } = detectorWithFakeWorker();
    const before = detector.detect(new Blob(["a"]));
    workers[0]?.crash();
    await expect(before).rejects.toThrow(FocusDetectionError);

    await expect(detector.detect(new Blob(["b"]))).rejects.toThrow(FocusDetectionError);
    expect(workers).toHaveLength(1);
    expect(workers[0]?.requests).toHaveLength(1);
  });
});
