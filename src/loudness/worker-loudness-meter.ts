import {
  LoudnessMeterGoneError,
  MusicUnmeasurableError,
  type LoudnessMeter,
} from "../library/loudness-meter";
import type { LoudnessReply, LoudnessRequest } from "./loudness-worker-protocol";
import type { MusicLoudness } from "./measure-loudness";

/** A track decoded to every channel at its own sample rate (ADR-0040). */
export interface DecodedMusic {
  readonly channels: readonly Float32Array[];
  readonly sampleRate: number;
}

/** Turns a music file into its channels; the browser's decoder behind a seam. Rejects when it cannot. */
export type DecodeMusic = (music: Blob) => Promise<DecodedMusic>;

/** The part of a `Worker` running `loudness-worker.ts` that the meter talks to. */
export interface LoudnessWorker {
  postMessage(request: LoudnessRequest, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<LoudnessReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
}

/** A measurement the worker could not finish. */
export class LoudnessMeasurementError extends Error {
  override readonly name = "LoudnessMeasurementError";
}

interface PendingMeasurement {
  resolve(loudness: MusicLoudness): void;
  reject(error: Error): void;
}

/** Starts the worker that measures loudness off the main thread (ADR-0040). */
export function startLoudnessWorker(): Worker {
  return new Worker(new URL("./loudness-worker.ts", import.meta.url), { type: "module" });
}

/**
 * Decodes on the main thread, where the browser's decoder lives, and measures loudness in one
 * worker, started on the first measurement. Once the worker has crashed or sent a reply that
 * cannot be read, every measurement rejects with `LoudnessMeterGoneError`.
 */
export class WorkerLoudnessMeter implements LoudnessMeter {
  readonly #decode: DecodeMusic;
  readonly #startWorker: () => LoudnessWorker;
  readonly #pending = new Map<number, PendingMeasurement>();
  #worker: LoudnessWorker | undefined;
  #gone: LoudnessMeterGoneError | undefined;
  #nextId = 0;

  constructor(decode: DecodeMusic, startWorker: () => LoudnessWorker) {
    this.#decode = decode;
    this.#startWorker = startWorker;
  }

  async measure(music: Blob): Promise<MusicLoudness> {
    if (this.#gone) throw this.#gone;
    const { channels, sampleRate } = await this.#decode(music).catch((error: unknown) => {
      throw new MusicUnmeasurableError({ cause: error });
    });
    if (this.#gone) throw this.#gone;
    const id = this.#nextId++;
    const { promise, resolve, reject } = Promise.withResolvers<MusicLoudness>();
    this.#pending.set(id, { resolve, reject });
    // Transferred, not copied: a long stereo track's channels are tens of megabytes.
    this.#workerStarted().postMessage(
      { id, channels, sampleRate },
      channels.map((channel) => channel.buffer),
    );
    return promise;
  }

  #workerStarted(): LoudnessWorker {
    if (this.#worker) return this.#worker;
    const worker = this.#startWorker();
    worker.onmessage = (event) => this.#settle(event.data);
    worker.onerror = () => this.#goneWith("The loudness worker crashed; no music can be measured");
    worker.onmessageerror = () =>
      this.#goneWith("A reply of the loudness worker could not be read; no music can be measured");
    this.#worker = worker;
    return worker;
  }

  #settle(reply: LoudnessReply): void {
    const pending = this.#pending.get(reply.id);
    this.#pending.delete(reply.id);
    if (reply.kind === "found") pending?.resolve(reply.loudness);
    else pending?.reject(new LoudnessMeasurementError(reply.message));
  }

  #goneWith(message: string): void {
    this.#gone ??= new LoudnessMeterGoneError(message);
    for (const pending of this.#pending.values()) pending.reject(this.#gone);
    this.#pending.clear();
  }
}
