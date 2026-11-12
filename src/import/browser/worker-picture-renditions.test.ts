import { describe, expect, it } from "vitest";
import type { DecodedPicture } from "../downscale";
import { UnreadablePictureError } from "../unreadable-picture";
import {
  WorkerPictureRenditions,
  type PictureRenditionsWorker,
  type RenditionsReply,
  type RenditionsRequest,
} from "./worker-picture-renditions";

/** Stands in for the worker: records requests, replies and fails only when the test says so. */
class FakeRenditionsWorker implements PictureRenditionsWorker {
  readonly requests: RenditionsRequest[] = [];
  onmessage: ((event: MessageEvent<RenditionsReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  terminated = false;

  postMessage(request: RenditionsRequest): void {
    this.requests.push(request);
  }

  reply(reply: RenditionsReply): void {
    this.onmessage?.(new MessageEvent("message", { data: reply }));
  }

  crash(): void {
    this.onerror?.(new ErrorEvent("error"));
  }

  terminate(): void {
    this.terminated = true;
  }
}

const FILE = new File(["picture"], "beach.jpg", { type: "image/jpeg" });
const FROM_WORKER: DecodedPicture = {
  width: 3840,
  height: 2560,
  display: new Blob(["display from the worker"]),
  thumbnail: new Blob(["thumbnail from the worker"]),
};
const ON_MAIN_THREAD: DecodedPicture = { ...FROM_WORKER, display: new Blob(["main thread"]) };

function renditionsWith(worker: FakeRenditionsWorker) {
  const fallbackFiles: File[] = [];
  const renditions = new WorkerPictureRenditions(
    () => worker,
    (file) => {
      fallbackFiles.push(file);
      return Promise.resolve(ON_MAIN_THREAD);
    },
  );
  return { renditions, fallbackFiles };
}

describe("WorkerPictureRenditions", () => {
  it("makes each picture's renditions in the worker and resolves each request with its own reply", async () => {
    const worker = new FakeRenditionsWorker();
    const { renditions, fallbackFiles } = renditionsWith(worker);

    const first = renditions.decode(FILE);
    const second = renditions.decode(FILE);
    worker.reply({ id: worker.requests[1]?.id ?? -1, kind: "decoded", picture: FROM_WORKER });
    worker.reply({ id: worker.requests[0]?.id ?? -1, kind: "decoded", picture: ON_MAIN_THREAD });

    expect(worker.requests.map(({ file }) => file)).toEqual([FILE, FILE]);
    await expect(second).resolves.toBe(FROM_WORKER);
    await expect(first).resolves.toBe(ON_MAIN_THREAD);
    expect(fallbackFiles).toEqual([]);
  });

  it.each(["read", "decode", "tooLarge"] as const)(
    "rejects a picture the worker found unreadable at %s with UnreadablePictureError, without a second try",
    async (stage) => {
      const worker = new FakeRenditionsWorker();
      const { renditions, fallbackFiles } = renditionsWith(worker);

      const decoded = renditions.decode(FILE);
      worker.reply({ id: worker.requests[0]?.id ?? -1, kind: "unreadable", stage });

      await expect(decoded).rejects.toThrow(new UnreadablePictureError(FILE.name, stage));
      expect(worker.requests).toHaveLength(1);
      expect(fallbackFiles).toEqual([]);
    },
  );

  it("makes the picture on the main thread, and every later one too, once the worker failed one", async () => {
    const worker = new FakeRenditionsWorker();
    const { renditions, fallbackFiles } = renditionsWith(worker);

    const failed = renditions.decode(FILE);
    worker.reply({
      id: worker.requests[0]?.id ?? -1,
      kind: "failed",
      message: "no OffscreenCanvas",
    });
    await expect(failed).resolves.toBe(ON_MAIN_THREAD);
    await expect(renditions.decode(FILE)).resolves.toBe(ON_MAIN_THREAD);

    expect(worker.requests).toHaveLength(1);
    expect(worker.terminated).toBe(true);
    expect(fallbackFiles).toEqual([FILE, FILE]);
  });

  it("hands the pending pictures to the main thread when the worker crashed", async () => {
    const worker = new FakeRenditionsWorker();
    const { renditions, fallbackFiles } = renditionsWith(worker);

    const pending = renditions.decode(FILE);
    worker.crash();

    await expect(pending).resolves.toBe(ON_MAIN_THREAD);
    expect(worker.requests).toHaveLength(1);
    expect(fallbackFiles).toEqual([FILE]);
  });

  it("makes the pictures on the main thread when the worker cannot be started", async () => {
    const fallbackFiles: File[] = [];
    const renditions = new WorkerPictureRenditions(
      () => {
        throw new Error("workers are blocked");
      },
      (file) => {
        fallbackFiles.push(file);
        return Promise.resolve(ON_MAIN_THREAD);
      },
    );

    await expect(renditions.decode(FILE)).resolves.toBe(ON_MAIN_THREAD);
    expect(fallbackFiles).toEqual([FILE]);
  });
});
