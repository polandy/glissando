import { describe, expect, it } from "vitest";
import {
  PictureDecodeError,
  WorkerPictureDecoder,
  type DecodeReply,
  type DecodeRequest,
  type PictureDecodeWorker,
} from "./worker-picture-decoder";

/** Stands in for the worker: records requests, replies and fails only when the test says so. */
class FakeDecodeWorker implements PictureDecodeWorker {
  readonly requests: DecodeRequest[] = [];
  onmessage: ((event: MessageEvent<DecodeReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  postMessage(request: DecodeRequest): void {
    this.requests.push(request);
  }

  reply(reply: DecodeReply): void {
    this.onmessage?.(new MessageEvent("message", { data: reply }));
  }

  terminated = false;

  terminate(): void {
    this.terminated = true;
  }

  crash(): void {
    this.onerror?.(new ErrorEvent("error"));
  }
}

const BYTES = new Blob(["picture"]);
const BITMAP = { width: 4, height: 3 } as ImageBitmap;

/** A bitmap that records whether it was closed. */
function closableBitmap(): { readonly bitmap: ImageBitmap; closed(): boolean } {
  let closed = false;
  const bitmap = {
    width: 4,
    height: 3,
    close: () => {
      closed = true;
    },
  } as ImageBitmap;
  return { bitmap, closed: () => closed };
}

describe("WorkerPictureDecoder", () => {
  it("starts one worker on the first decode and resolves each request with its own reply", async () => {
    const workers: FakeDecodeWorker[] = [];
    const decoder = new WorkerPictureDecoder(() => {
      workers.push(new FakeDecodeWorker());
      return workers[0] as FakeDecodeWorker;
    });

    const first = decoder.decode(BYTES);
    const second = decoder.decode(BYTES);
    const [worker] = workers;
    worker?.reply({ id: worker.requests[1]?.id ?? -1, kind: "decoded", bitmap: BITMAP });
    worker?.reply({ id: worker.requests[0]?.id ?? -1, kind: "failed", message: "corrupt" });

    expect(workers).toHaveLength(1);
    await expect(second).resolves.toBe(BITMAP);
    await expect(first).rejects.toThrow(new PictureDecodeError("corrupt"));
  });

  it("rejects pending and later decodes once the worker crashed", async () => {
    const worker = new FakeDecodeWorker();
    const decoder = new WorkerPictureDecoder(() => worker);

    const pending = decoder.decode(BYTES);
    worker.crash();

    await expect(pending).rejects.toBeInstanceOf(PictureDecodeError);
    await expect(decoder.decode(BYTES)).rejects.toBeInstanceOf(PictureDecodeError);
    expect(worker.requests).toHaveLength(1);
  });

  it("terminates a worker that crashed", () => {
    const worker = new FakeDecodeWorker();
    const decoder = new WorkerPictureDecoder(() => worker);
    decoder.decode(BYTES).catch(() => {
      // The crash rejects it; this case is about the worker.
    });

    worker.crash();

    expect(worker.terminated).toBe(true);
  });

  it("closes a decoded picture whose request was already rejected", async () => {
    const worker = new FakeDecodeWorker();
    const decoder = new WorkerPictureDecoder(() => worker);
    const pending = decoder.decode(BYTES);
    worker.onmessageerror?.(new MessageEvent("messageerror"));
    const late = closableBitmap();

    worker.reply({ id: worker.requests[0]?.id ?? -1, kind: "decoded", bitmap: late.bitmap });

    await expect(pending).rejects.toBeInstanceOf(PictureDecodeError);
    expect(late.closed()).toBe(true);
  });

  it("terminates the worker on dispose and rejects what it was decoding", async () => {
    const worker = new FakeDecodeWorker();
    const decoder = new WorkerPictureDecoder(() => worker);
    const pending = decoder.decode(BYTES);

    decoder.dispose();

    expect(worker.terminated).toBe(true);
    await expect(pending).rejects.toBeInstanceOf(PictureDecodeError);
  });
});
