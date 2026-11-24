import { FocusDetectorGoneError, type FocusDetector } from "../library/focus-detector";
import type { PictureFocus } from "../library/picture-focus";
import type { Scheduler } from "../ui-kit/scheduler";
import {
  WorkerRequestClient,
  type ReplyReading,
  type RequestWorker,
} from "../worker-requests/worker-request-client";
import type { FocusReply, FocusRequest } from "./focus-worker-protocol";

/** The part of a `Worker` running `focus-worker.ts` that the detector talks to. */
export type FocusWorker = RequestWorker<FocusRequest, FocusReply>;

/** How long the worker may sit without a request before it ends and frees its memory (ADR-0060). */
export const FOCUS_WORKER_IDLE_END_MS = 30_000;

/** A detection the worker could not finish: an undecodable thumbnail. */
export class FocusDetectionError extends Error {
  override readonly name = "FocusDetectionError";
}

/** Starts the worker that runs the face detector off the main thread (ADR-0012). */
export function startFocusWorker(): Worker {
  return new Worker(new URL("./focus-worker.ts", import.meta.url), { type: "module" });
}

/**
 * Detects in one worker, started on the first detection, so a phone's slow search never blocks
 * playback, and ended after `FOCUS_WORKER_IDLE_END_MS` without a request. Once the worker has crashed, sent a reply that cannot be read or said it can detect
 * in no picture, every detection rejects with `FocusDetectorGoneError`.
 */
export class WorkerFocusDetector implements FocusDetector {
  readonly #client: WorkerRequestClient<FocusRequest, FocusReply, PictureFocus>;

  constructor(startWorker: () => FocusWorker, scheduler: Scheduler) {
    this.#client = new WorkerRequestClient({
      startWorker,
      readReply: readFocusReply,
      goneError: (message) => new FocusDetectorGoneError(message),
      crashMessage: "The focus worker crashed; no picture can be searched",
      unreadableReplyMessage:
        "A reply of the focus worker could not be read; no picture can be searched",
      idleEnd: { afterMs: FOCUS_WORKER_IDLE_END_MS, scheduler },
    });
  }

  detect(thumbnail: Blob, display?: Blob): Promise<PictureFocus> {
    return this.#client.request((id) =>
      display === undefined
        ? { id, kind: "detect", thumbnail }
        : { id, kind: "detect", thumbnail, display },
    );
  }

  measure(display: Blob, focus: PictureFocus): Promise<PictureFocus> {
    return this.#client.request((id) => ({ id, kind: "measure", display, focus }));
  }
}

function readFocusReply(reply: FocusReply): ReplyReading<PictureFocus> {
  switch (reply.kind) {
    case "found":
      return { kind: "settled", id: reply.id, result: reply.focus };
    case "failed":
      return { kind: "failed", id: reply.id, error: new FocusDetectionError(reply.message) };
    case "runner":
      return {
        kind: "failed",
        id: reply.id,
        error: new Error("Nobody asked the focus worker for its runner"),
      };
    case "unavailable":
      return { kind: "gone", message: reply.message };
  }
}
