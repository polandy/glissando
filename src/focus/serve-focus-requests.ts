// The worker side of `WorkerFocusDetector`: decodes each thumbnail and runs the face and object
// detectors on it, off the main thread (ADR-0012, ADR-0036). Typed with the DOM lib, whose `self` covers what a
// dedicated worker uses here.
import type { PictureFocus } from "../library/picture-focus";
import { detectFocus, type FocusModels } from "./detect-focus";
import cascadeUrl from "./facefinder.bin?url";
import type { FocusReply, FocusRequest, FocusRunnerKind } from "./focus-worker-protocol";
import type { RgbaImage } from "./object-focus";
import type { ObjectRunner } from "./onnx/object-runner";
import { parseOnnx, type OnnxGraph } from "./onnx/onnx-model";
import { unpackCascade } from "./pico";
import { messageOf, postReply } from "./post-reply";
import { screenSharpness } from "./screen-sharpness";
import objectNetworkUrl from "./yolox-nano.bin?url";

/** Builds what runs the parsed object network: the Rust kernels or the TypeScript runner (ADR-0060). */
type LoadObjectRunner = (graph: OnnxGraph) => Promise<ObjectRunner>;

/** Answers every focus request this worker receives; the models load once, when it starts. */
export function serveFocusRequests(loadObjectRunner: LoadObjectRunner): void {
  const models = loadModels(loadObjectRunner);
  self.addEventListener("message", (event: MessageEvent<FocusRequest>) => {
    void postReply(
      event.data,
      () => answer(event.data, models),
      (reply) => self.postMessage(reply),
    );
  });
}

async function answer(request: FocusRequest, models: Promise<LoadedModels>): Promise<FocusReply> {
  const { id } = request;
  if (request.kind === "runner") {
    return runnerReply(id, models);
  }
  if (request.kind === "measure") {
    return found(id, request.focus, request.display);
  }
  let loaded: LoadedModels;
  try {
    loaded = await models;
  } catch (error) {
    return { id, kind: "unavailable", message: messageOf(error) };
  }
  let focus: PictureFocus;
  try {
    focus = detectFocus(await pixelsOf(request.thumbnail), loaded);
  } catch (error) {
    return { id, kind: "failed", message: messageOf(error) };
  }
  return found(id, focus, request.display);
}

async function runnerReply(id: number, models: Promise<LoadedModels>): Promise<FocusReply> {
  try {
    return { id, kind: "runner", runner: (await models).runner };
  } catch (error) {
    return { id, kind: "unavailable", message: messageOf(error) };
  }
}

/** `focus` as the reply to request `id`, with its sharpness on `display` when there is one. */
async function found(id: number, focus: PictureFocus, display?: Blob): Promise<FocusReply> {
  if (display === undefined) return { id, kind: "found", focus };
  try {
    return {
      id,
      kind: "found",
      focus: { ...focus, sharpness: await screenSharpness(display, focus) },
    };
  } catch (error) {
    return { id, kind: "failed", message: messageOf(error) };
  }
}

interface LoadedModels extends FocusModels {
  readonly runner: FocusRunnerKind;
}

async function loadModels(loadObjectRunner: LoadObjectRunner): Promise<LoadedModels> {
  const [cascade, objects] = await Promise.all([
    download(cascadeUrl, "face cascade"),
    download(objectNetworkUrl, "object network"),
  ]);
  const runner = await loadObjectRunner(parseOnnx(new Uint8Array(objects)));
  return {
    cascade: unpackCascade(new Int8Array(cascade)),
    objects: runner.network,
    runner: runner.kind,
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
