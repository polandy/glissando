import type { CheckReply, CheckRequest } from "./check-worker-protocol";
import {
  PictureCheckError,
  PictureCheckerGoneError,
  type PictureChecker,
  type PictureMeasure,
} from "./picture-checker";

/** The part of a `Worker` running `check-worker.ts` that the checker talks to. */
export interface CheckWorker {
  postMessage(request: CheckRequest): void;
  onmessage: ((event: MessageEvent<CheckReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
}

interface PendingCheck {
  resolve(measure: PictureMeasure): void;
  reject(error: Error): void;
}

/** Starts the worker that measures thumbnails off the main thread (ADR-0024). */
export function startCheckWorker(): Worker {
  return new Worker(new URL("./check-worker.ts", import.meta.url), { type: "module" });
}

/**
 * Measures in one worker, started on the first measurement, so the downscale of the next picture
 * goes on meanwhile. Once the worker has crashed or sent a reply that cannot be read, every
 * measurement rejects with `PictureCheckerGoneError`.
 */
export class WorkerPictureChecker implements PictureChecker {
  readonly #startWorker: () => CheckWorker;
  readonly #pending = new Map<number, PendingCheck>();
  #worker: CheckWorker | undefined;
  #gone: PictureCheckerGoneError | undefined;
  #nextId = 0;

  constructor(startWorker: () => CheckWorker) {
    this.#startWorker = startWorker;
  }

  measure(thumbnail: Blob): Promise<PictureMeasure> {
    if (this.#gone) return Promise.reject(this.#gone);
    const id = this.#nextId++;
    const { promise, resolve, reject } = Promise.withResolvers<PictureMeasure>();
    this.#pending.set(id, { resolve, reject });
    this.#workerStarted().postMessage({ id, thumbnail });
    return promise;
  }

  #workerStarted(): CheckWorker {
    if (this.#worker) return this.#worker;
    const worker = this.#startWorker();
    worker.onmessage = (event) => this.#settle(event.data);
    worker.onerror = () => this.#goneWith("The check worker crashed; no picture can be checked");
    worker.onmessageerror = () =>
      this.#goneWith("A reply of the check worker could not be read; no picture can be checked");
    this.#worker = worker;
    return worker;
  }

  #settle(reply: CheckReply): void {
    const pending = this.#pending.get(reply.id);
    this.#pending.delete(reply.id);
    if (reply.kind === "measured") pending?.resolve(reply.measure);
    else pending?.reject(new PictureCheckError(reply.message));
  }

  #goneWith(message: string): void {
    this.#gone ??= new PictureCheckerGoneError(message);
    for (const pending of this.#pending.values()) pending.reject(this.#gone);
    this.#pending.clear();
  }
}
