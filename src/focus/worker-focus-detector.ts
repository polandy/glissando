import { FocusDetectorGoneError, type FocusDetector } from "../library/focus-detector";
import type { PictureFocus } from "../library/picture-focus";
import type { FocusReply, FocusRequest } from "./focus-worker-protocol";

/** The part of a `Worker` running `focus-worker.ts` that the detector talks to. */
export interface FocusWorker {
  postMessage(request: FocusRequest): void;
  onmessage: ((event: MessageEvent<FocusReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
}

/** A detection the worker could not finish: an undecodable thumbnail. */
export class FocusDetectionError extends Error {
  override readonly name = "FocusDetectionError";
}

interface PendingDetection {
  resolve(focus: PictureFocus): void;
  reject(error: Error): void;
}

/** Starts the worker that runs the face detector off the main thread (ADR-0012). */
export function startFocusWorker(): Worker {
  return new Worker(new URL("./focus-worker.ts", import.meta.url), { type: "module" });
}

/**
 * Detects in one worker, started on the first detection, so a phone's slow search never blocks
 * playback. Once the worker has crashed, sent a reply that cannot be read or said it can detect
 * in no picture, every detection rejects with `FocusDetectorGoneError`.
 */
export class WorkerFocusDetector implements FocusDetector {
  readonly #startWorker: () => FocusWorker;
  readonly #pending = new Map<number, PendingDetection>();
  #worker: FocusWorker | undefined;
  #gone: FocusDetectorGoneError | undefined;
  #nextId = 0;

  constructor(startWorker: () => FocusWorker) {
    this.#startWorker = startWorker;
  }

  detect(thumbnail: Blob): Promise<PictureFocus> {
    if (this.#gone) return Promise.reject(this.#gone);
    const id = this.#nextId++;
    const { promise, resolve, reject } = Promise.withResolvers<PictureFocus>();
    this.#pending.set(id, { resolve, reject });
    this.#workerStarted().postMessage({ id, thumbnail });
    return promise;
  }

  #workerStarted(): FocusWorker {
    if (this.#worker) return this.#worker;
    const worker = this.#startWorker();
    worker.onmessage = (event) => this.#settle(event.data);
    worker.onerror = () => this.#goneWith("The focus worker crashed; no picture can be searched");
    worker.onmessageerror = () =>
      this.#goneWith("A reply of the focus worker could not be read; no picture can be searched");
    this.#worker = worker;
    return worker;
  }

  #settle(reply: FocusReply): void {
    if (reply.kind === "unavailable") {
      this.#goneWith(reply.message);
      return;
    }
    const pending = this.#pending.get(reply.id);
    this.#pending.delete(reply.id);
    if (reply.kind === "found") pending?.resolve(reply.focus);
    else pending?.reject(new FocusDetectionError(reply.message));
  }

  #goneWith(message: string): void {
    this.#gone ??= new FocusDetectorGoneError(message);
    for (const pending of this.#pending.values()) pending.reject(this.#gone);
    this.#pending.clear();
  }
}
