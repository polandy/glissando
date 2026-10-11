import {
  BeatDetectorGoneError,
  MusicUndecodableError,
  type BeatDetector,
} from "../library/beat-detector";
import type { BeatReply, BeatRequest } from "./beat-worker-protocol";
import type { MusicBeats } from "./music-beats";

/** A track decoded to mono samples at the rate the detector analyses (ADR-0021). */
export interface DecodedMusic {
  readonly samples: Float32Array;
  readonly sampleRate: number;
}

/** Turns a music file into mono samples; the browser's decoder behind a seam. Rejects when it cannot. */
export type DecodeMusic = (music: Blob) => Promise<DecodedMusic>;

/** The part of a `Worker` running `beat-worker.ts` that the detector talks to. */
export interface BeatWorker {
  postMessage(request: BeatRequest, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<BeatReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
}

/** A detection the worker could not finish. */
export class BeatDetectionError extends Error {
  override readonly name = "BeatDetectionError";
}

interface PendingDetection {
  resolve(beats: MusicBeats): void;
  reject(error: Error): void;
}

/** Starts the worker that finds the beats off the main thread (ADR-0021). */
export function startBeatWorker(): Worker {
  return new Worker(new URL("./beat-worker.ts", import.meta.url), { type: "module" });
}

/**
 * Decodes on the main thread, where the browser's decoder lives, and finds the beats in one
 * worker, started on the first detection. Once the worker has crashed or sent a reply that cannot
 * be read, every detection rejects with `BeatDetectorGoneError`.
 */
export class WorkerBeatDetector implements BeatDetector {
  readonly #decode: DecodeMusic;
  readonly #startWorker: () => BeatWorker;
  readonly #pending = new Map<number, PendingDetection>();
  #worker: BeatWorker | undefined;
  #gone: BeatDetectorGoneError | undefined;
  #nextId = 0;

  constructor(decode: DecodeMusic, startWorker: () => BeatWorker) {
    this.#decode = decode;
    this.#startWorker = startWorker;
  }

  async detect(music: Blob): Promise<MusicBeats> {
    if (this.#gone) throw this.#gone;
    const { samples, sampleRate } = await this.#decode(music).catch((error: unknown) => {
      throw new MusicUndecodableError({ cause: error });
    });
    if (this.#gone) throw this.#gone;
    const id = this.#nextId++;
    const { promise, resolve, reject } = Promise.withResolvers<MusicBeats>();
    this.#pending.set(id, { resolve, reject });
    // Transferred, not copied: a long track's samples are tens of megabytes.
    this.#workerStarted().postMessage({ id, samples, sampleRate }, [samples.buffer]);
    return promise;
  }

  #workerStarted(): BeatWorker {
    if (this.#worker) return this.#worker;
    const worker = this.#startWorker();
    worker.onmessage = (event) => this.#settle(event.data);
    worker.onerror = () => this.#goneWith("The beat worker crashed; no music can be listened to");
    worker.onmessageerror = () =>
      this.#goneWith("A reply of the beat worker could not be read; no music can be listened to");
    this.#worker = worker;
    return worker;
  }

  #settle(reply: BeatReply): void {
    const pending = this.#pending.get(reply.id);
    this.#pending.delete(reply.id);
    if (reply.kind === "found") pending?.resolve(reply.beats);
    else pending?.reject(new BeatDetectionError(reply.message));
  }

  #goneWith(message: string): void {
    this.#gone ??= new BeatDetectorGoneError(message);
    for (const pending of this.#pending.values()) pending.reject(this.#gone);
    this.#pending.clear();
  }
}
