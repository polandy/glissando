import type { PictureDecoder } from "./bitmap-loader";

/** Asks the decode worker for one picture; the id pairs it with its reply. */
export interface DecodeRequest {
  readonly id: number;
  readonly bytes: Blob;
}

/** The decode worker's answer to the request with the same id. */
export type DecodeReply =
  | { readonly id: number; readonly kind: "decoded"; readonly bitmap: ImageBitmap }
  | { readonly id: number; readonly kind: "failed"; readonly message: string };

/** The part of a `Worker` running `picture-decode-worker.ts` that the decoder talks to. */
export interface PictureDecodeWorker {
  postMessage(request: DecodeRequest): void;
  onmessage: ((event: MessageEvent<DecodeReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  terminate(): void;
}

/** A picture the browser could not decode, or a decode worker that is gone. */
export class PictureDecodeError extends Error {
  override readonly name = "PictureDecodeError";
}

interface PendingDecode {
  resolve(bitmap: ImageBitmap): void;
  reject(error: Error): void;
}

/**
 * Decodes in one worker, started on the first picture. Once the worker could not be started, has
 * crashed or sent a reply that cannot be read, or was disposed, it is terminated and every decode
 * rejects with `PictureDecodeError`.
 */
export class WorkerPictureDecoder implements PictureDecoder {
  readonly #startWorker: () => PictureDecodeWorker;
  readonly #pending = new Map<number, PendingDecode>();
  #worker: PictureDecodeWorker | undefined;
  #gone: PictureDecodeError | undefined;
  #nextId = 0;

  constructor(startWorker: () => PictureDecodeWorker) {
    this.#startWorker = startWorker;
  }

  decode(bytes: Blob): Promise<ImageBitmap> {
    if (this.#gone) return Promise.reject(this.#gone);
    const id = this.#nextId++;
    const { promise, resolve, reject } = Promise.withResolvers<ImageBitmap>();
    this.#pending.set(id, { resolve, reject });
    let worker: PictureDecodeWorker;
    try {
      worker = this.#workerStarted();
    } catch (error: unknown) {
      this.#goneWith("The picture decode worker could not be started", { cause: error });
      return promise;
    }
    worker.postMessage({ id, bytes });
    return promise;
  }

  dispose(): void {
    this.#goneWith("The picture decoder was disposed");
  }

  #workerStarted(): PictureDecodeWorker {
    if (this.#worker) return this.#worker;
    const worker = this.#startWorker();
    worker.onmessage = (event) => this.#settle(event.data);
    worker.onerror = () => this.#goneWith("The picture decode worker crashed");
    worker.onmessageerror = () =>
      this.#goneWith("A decoded picture could not be read from the picture decode worker");
    this.#worker = worker;
    return worker;
  }

  #settle(reply: DecodeReply): void {
    const pending = this.#pending.get(reply.id);
    this.#pending.delete(reply.id);
    if (reply.kind === "failed") pending?.reject(new PictureDecodeError(reply.message));
    // A reply to a request already rejected is nobody's, so its bitmap is closed here.
    else if (pending === undefined) reply.bitmap.close();
    else pending.resolve(reply.bitmap);
  }

  #goneWith(message: string, options?: ErrorOptions): void {
    this.#gone ??= new PictureDecodeError(message, options);
    this.#worker?.terminate();
    for (const pending of this.#pending.values()) pending.reject(this.#gone);
    this.#pending.clear();
  }
}
