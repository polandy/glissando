// The worker side of `WorkerFocusDetector`: decodes each thumbnail and runs the face detector
// on it, off the main thread (ADR-0012). Typed with the DOM lib, whose `self` covers what a
// dedicated worker uses here.
import cascadeUrl from "./facefinder.bin?url";
import { findFocus } from "./find-focus";
import type { FocusReply, FocusRequest } from "./focus-worker-protocol";
import { greyFromRgba, type GreyImage } from "./grey-image";
import { unpackCascade, type Cascade } from "./pico";

// Loaded once, when the worker starts, and shared by every request.
const cascade = loadCascade();

self.addEventListener("message", (event: MessageEvent<FocusRequest>) => {
  void answer(event.data).then((reply) => self.postMessage(reply));
});

async function answer({ id, thumbnail }: FocusRequest): Promise<FocusReply> {
  let loaded: Cascade;
  try {
    loaded = await cascade;
  } catch (error) {
    return { id, kind: "unavailable", message: messageOf(error) };
  }
  try {
    return { id, kind: "found", focus: findFocus(await greyOf(thumbnail), loaded) };
  } catch (error) {
    return { id, kind: "failed", message: messageOf(error) };
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function loadCascade(): Promise<Cascade> {
  const response = await fetch(cascadeUrl);
  if (!response.ok) {
    throw new Error(`The face cascade ${cascadeUrl} did not load: HTTP ${response.status}`);
  }
  return unpackCascade(new Int8Array(await response.arrayBuffer()));
}

async function greyOf(thumbnail: Blob): Promise<GreyImage> {
  const bitmap = await createImageBitmap(thumbnail);
  try {
    const { width, height } = bitmap;
    const context = new OffscreenCanvas(width, height).getContext("2d");
    if (!context) throw new Error("The focus worker has no 2D canvas to decode thumbnails in");
    context.drawImage(bitmap, 0, 0);
    return greyFromRgba(context.getImageData(0, 0, width, height).data, width, height);
  } finally {
    bitmap.close();
  }
}
