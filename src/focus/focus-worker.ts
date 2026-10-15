// The worker side of `WorkerFocusDetector`: decodes each thumbnail and runs the face and animal
// detectors on it, off the main thread (ADR-0012, ADR-0036). Typed with the DOM lib, whose `self` covers what a
// dedicated worker uses here.
import type { RgbaImage } from "./animal-focus";
import { detectFocus, type FocusModels } from "./detect-focus";
import cascadeUrl from "./facefinder.bin?url";
import type { FocusReply, FocusRequest } from "./focus-worker-protocol";
import { parseOnnx } from "./onnx/onnx-model";
import { unpackCascade } from "./pico";
import animalNetworkUrl from "./yolox-nano.bin?url";

// Loaded once, when the worker starts, and shared by every request.
const models = loadModels();

self.addEventListener("message", (event: MessageEvent<FocusRequest>) => {
  void answer(event.data).then((reply) => self.postMessage(reply));
});

async function answer({ id, thumbnail }: FocusRequest): Promise<FocusReply> {
  let loaded: FocusModels;
  try {
    loaded = await models;
  } catch (error) {
    return { id, kind: "unavailable", message: messageOf(error) };
  }
  try {
    return { id, kind: "found", focus: detectFocus(await pixelsOf(thumbnail), loaded) };
  } catch (error) {
    return { id, kind: "failed", message: messageOf(error) };
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function loadModels(): Promise<FocusModels> {
  const [cascade, animals] = await Promise.all([
    download(cascadeUrl, "face cascade"),
    download(animalNetworkUrl, "animal network"),
  ]);
  return {
    cascade: unpackCascade(new Int8Array(cascade)),
    animals: parseOnnx(new Uint8Array(animals)),
  };
}

async function download(url: string, what: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The ${what} ${url} did not load: HTTP ${response.status}`);
  return response.arrayBuffer();
}

async function pixelsOf(thumbnail: Blob): Promise<RgbaImage> {
  const bitmap = await createImageBitmap(thumbnail);
  try {
    const { width, height } = bitmap;
    const context = new OffscreenCanvas(width, height).getContext("2d");
    if (!context) throw new Error("The focus worker has no 2D canvas to decode thumbnails in");
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, width, height);
  } finally {
    bitmap.close();
  }
}
