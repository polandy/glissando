import {
  MusicAnalyserGoneError,
  MusicUndecodableError,
  type MusicAnalyser,
  type MusicAnalysis,
} from "../library/music-analyser";
import type { AnalysisReply, AnalysisRequest } from "./analysis-worker-protocol";
import type { DecodeMusic } from "./decode-music-full-rate";

/** The part of a `Worker` running `analysis-worker.ts` that the analyser talks to. */
export interface AnalysisWorker {
  postMessage(request: AnalysisRequest, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<AnalysisReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
}

/** An analysis the worker could not finish. */
export class MusicAnalysisError extends Error {
  override readonly name = "MusicAnalysisError";
}

interface PendingAnalysis {
  resolve(analysis: MusicAnalysis): void;
  reject(error: Error): void;
}

/** Starts the worker that analyses music off the main thread (ADR-0051). */
export function startAnalysisWorker(): Worker {
  return new Worker(new URL("./analysis-worker.ts", import.meta.url), { type: "module" });
}

/**
 * Decodes on the main thread, where the browser's decoder lives, and analyses in one worker,
 * started on the first analysis. Once the worker has crashed or sent a reply that cannot be read,
 * every analysis rejects with `MusicAnalyserGoneError`.
 */
export class WorkerMusicAnalyser implements MusicAnalyser {
  readonly #decode: DecodeMusic;
  readonly #startWorker: () => AnalysisWorker;
  readonly #pending = new Map<number, PendingAnalysis>();
  #worker: AnalysisWorker | undefined;
  #gone: MusicAnalyserGoneError | undefined;
  #nextId = 0;

  constructor(decode: DecodeMusic, startWorker: () => AnalysisWorker) {
    this.#decode = decode;
    this.#startWorker = startWorker;
  }

  async analyse(music: Blob): Promise<MusicAnalysis> {
    if (this.#gone) throw this.#gone;
    const { channels, sampleRate } = await this.#decode(music).catch((error: unknown) => {
      throw new MusicUndecodableError({ cause: error });
    });
    if (this.#gone) throw this.#gone;
    const id = this.#nextId++;
    const { promise, resolve, reject } = Promise.withResolvers<MusicAnalysis>();
    this.#pending.set(id, { resolve, reject });
    // Transferred, not copied: a long stereo track's channels are tens of megabytes.
    this.#workerStarted().postMessage(
      { id, channels, sampleRate },
      channels.map((channel) => channel.buffer),
    );
    return promise;
  }

  #workerStarted(): AnalysisWorker {
    if (this.#worker) return this.#worker;
    const worker = this.#startWorker();
    worker.onmessage = (event) => this.#settle(event.data);
    worker.onerror = () => this.#goneWith("The analysis worker crashed; no music can be analysed");
    worker.onmessageerror = () =>
      this.#goneWith("A reply of the analysis worker could not be read; no music can be analysed");
    this.#worker = worker;
    return worker;
  }

  #settle(reply: AnalysisReply): void {
    const pending = this.#pending.get(reply.id);
    this.#pending.delete(reply.id);
    if (reply.kind === "found") pending?.resolve(reply.analysis);
    else pending?.reject(new MusicAnalysisError(reply.message));
  }

  #goneWith(message: string): void {
    this.#gone ??= new MusicAnalyserGoneError(message);
    for (const pending of this.#pending.values()) pending.reject(this.#gone);
    this.#pending.clear();
  }
}
