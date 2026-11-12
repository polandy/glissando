/** Starts the worker that makes pictures' stored renditions off the main thread. */
export function startPictureRenditionsWorker(): Worker {
  return new Worker(new URL("./picture-renditions-worker.ts", import.meta.url), { type: "module" });
}
