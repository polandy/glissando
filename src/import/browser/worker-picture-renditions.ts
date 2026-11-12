import type { DecodedPicture } from "../downscale";
import { UnreadablePictureError, type PictureFailureStage } from "../unreadable-picture";

/** Asks the renditions worker for one picture's renditions; the id pairs it with its reply. */
export interface RenditionsRequest {
  readonly id: number;
  readonly file: File;
}

/** The renditions worker's answer to the request with the same id. */
export type RenditionsReply =
  | { readonly id: number; readonly kind: "decoded"; readonly picture: DecodedPicture }
  | { readonly id: number; readonly kind: "unreadable"; readonly stage: PictureFailureStage }
  | { readonly id: number; readonly kind: "failed"; readonly message: string };

/** The part of a `Worker` running `picture-renditions-worker.ts` that this talks to. */
export interface PictureRenditionsWorker {
  postMessage(request: RenditionsRequest): void;
  onmessage: ((event: MessageEvent<RenditionsReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  terminate(): void;
}

/** Makes a picture file's stored renditions, as `decodePicture` does. */
export type DecodeRenditions = (file: File) => Promise<DecodedPicture>;

interface PendingRenditions {
  readonly file: File;
  resolve(picture: DecodedPicture): void;
  reject(error: unknown): void;
}

/**
 * Makes each picture's renditions in one worker, started on the first picture, so the JPEG
 * encode of a 4K rendition never holds a frame of a playing slideshow (ADR-0027). Once the worker
 * could not be started, crashed or failed a picture it could read, it is terminated and every
 * pending and later picture is made by `fallback` on the main thread instead.
 */
export class WorkerPictureRenditions {
  readonly #startWorker: () => PictureRenditionsWorker;
  readonly #fallback: DecodeRenditions;
  readonly #pending = new Map<number, PendingRenditions>();
  #worker: PictureRenditionsWorker | undefined;
  #gone = false;
  #nextId = 0;

  constructor(startWorker: () => PictureRenditionsWorker, fallback: DecodeRenditions) {
    this.#startWorker = startWorker;
    this.#fallback = fallback;
  }

  decode(file: File): Promise<DecodedPicture> {
    if (this.#gone) return this.#fallback(file);
    let worker: PictureRenditionsWorker;
    try {
      worker = this.#workerStarted();
    } catch {
      this.#goneToFallback();
      return this.#fallback(file);
    }
    const id = this.#nextId++;
    const { promise, resolve, reject } = Promise.withResolvers<DecodedPicture>();
    this.#pending.set(id, { file, resolve, reject });
    worker.postMessage({ id, file });
    return promise;
  }

  #workerStarted(): PictureRenditionsWorker {
    if (this.#worker) return this.#worker;
    const worker = this.#startWorker();
    worker.onmessage = (event) => this.#settle(event.data);
    worker.onerror = () => this.#goneToFallback();
    worker.onmessageerror = () => this.#goneToFallback();
    this.#worker = worker;
    return worker;
  }

  #settle(reply: RenditionsReply): void {
    const pending = this.#pending.get(reply.id);
    if (pending === undefined) return;
    this.#pending.delete(reply.id);
    if (reply.kind === "decoded") pending.resolve(reply.picture);
    else if (reply.kind === "unreadable") {
      pending.reject(new UnreadablePictureError(pending.file.name, reply.stage));
    } else {
      this.#goneToFallback();
      this.#fallback(pending.file).then(pending.resolve, pending.reject);
    }
  }

  #goneToFallback(): void {
    this.#gone = true;
    this.#worker?.terminate();
    for (const pending of this.#pending.values()) {
      this.#fallback(pending.file).then(pending.resolve, pending.reject);
    }
    this.#pending.clear();
  }
}
