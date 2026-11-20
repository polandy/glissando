// The worker side of `WorkerFocusDetector`: decodes each thumbnail and runs the face and object
// detectors on it, off the main thread (ADR-0012, ADR-0036). Typed with the DOM lib, whose `self` covers what a
// dedicated worker uses here.
import { detectFocus, type FocusModels } from "./detect-focus";
import cascadeUrl from "./facefinder.bin?url";
import type { FocusReply, FocusRequest } from "./focus-worker-protocol";
import type { ObjectNetwork, RgbaImage } from "./object-focus";
import { parseOnnx, type OnnxGraph } from "./onnx/onnx-model";
import { unpackCascade } from "./pico";
import { messageOf, postReply } from "./post-reply";
import objectNetworkUrl from "./yolox-nano.bin?url";

/** Builds what runs the parsed object network: the Rust kernels or the TypeScript runner (ADR-0060). */
type LoadObjectNetwork = (graph: OnnxGraph) => Promise<ObjectNetwork>;

/** Answers every focus request this worker receives; the models load once, when it starts. */
export function serveFocusRequests(loadObjectNetwork: LoadObjectNetwork): void {
  const models = loadModels(loadObjectNetwork);
  self.addEventListener("message", (event: MessageEvent<FocusRequest>) => {
    void postReply(
      event.data,
      () => answer(event.data, models),
      (reply) => self.postMessage(reply),
    );
  });
}

async function answer(
  { id, thumbnail }: FocusRequest,
  models: Promise<FocusModels>,
): Promise<FocusReply> {
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

async function loadModels(loadObjectNetwork: LoadObjectNetwork): Promise<FocusModels> {
  const [cascade, objects] = await Promise.all([
    download(cascadeUrl, "face cascade"),
    download(objectNetworkUrl, "object network"),
  ]);
  return {
    cascade: unpackCascade(new Int8Array(cascade)),
    objects: await loadObjectNetwork(parseOnnx(new Uint8Array(objects))),
  };
}

export async function download(url: string, what: string): Promise<ArrayBuffer> {
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
