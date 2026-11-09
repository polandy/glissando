import {
  MusicAnalyserGoneError,
  MusicUndecodableError,
  type MusicAnalyser,
  type MusicAnalysis,
} from "../library/music-analyser";
import type { AnalysisReply, AnalysisRequest } from "./analysis-worker-protocol";
import {
  WorkerRequestClient,
  type ReplyReading,
  type RequestWorker,
} from "../worker-requests/worker-request-client";
import type { DecodeMusic } from "./decode-music-full-rate";

/** The part of a `Worker` running `analysis-worker.ts` that the analyser talks to. */
export type AnalysisWorker = RequestWorker<AnalysisRequest, AnalysisReply>;

/** An analysis the worker could not finish. */
export class MusicAnalysisError extends Error {
  override readonly name = "MusicAnalysisError";
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
  readonly #client: WorkerRequestClient<AnalysisRequest, AnalysisReply, MusicAnalysis>;

  constructor(decode: DecodeMusic, startWorker: () => AnalysisWorker) {
    this.#decode = decode;
    this.#client = new WorkerRequestClient({
      startWorker,
      readReply: readAnalysisReply,
      goneError: (message) => new MusicAnalyserGoneError(message),
      crashMessage: "The analysis worker crashed; no music can be analysed",
      unreadableReplyMessage:
        "A reply of the analysis worker could not be read; no music can be analysed",
    });
  }

  async analyse(music: Blob): Promise<MusicAnalysis> {
    if (this.#client.gone) throw this.#client.gone;
    const { channels, sampleRate } = await this.#decode(music).catch((error: unknown) => {
      throw new MusicUndecodableError({ cause: error });
    });
    if (this.#client.gone) throw this.#client.gone;
    // Transferred, not copied: a long stereo track's channels are tens of megabytes.
    return this.#client.request(
      (id) => ({ id, channels, sampleRate }),
      channels.map((channel) => channel.buffer),
    );
  }
}

function readAnalysisReply(reply: AnalysisReply): ReplyReading<MusicAnalysis> {
  return reply.kind === "found"
    ? { kind: "settled", id: reply.id, result: reply.analysis }
    : { kind: "failed", id: reply.id, error: new MusicAnalysisError(reply.message) };
}
