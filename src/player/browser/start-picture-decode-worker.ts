/**
 * Starts the worker that decodes pictures off the main thread (ADR-0014). Its own module, so a
 * bundle that starts the worker differently (the exported page inlines it) never includes this
 * worker file.
 */
export function startPictureDecodeWorker(): Worker {
  return new Worker(new URL("./picture-decode-worker.ts", import.meta.url), { type: "module" });
}
