import { afterEach, describe, expect, it } from "vitest";
import type { FocusBox, PictureFocus } from "../library/picture-focus";
import { supportsWasmSimd } from "./onnx/wasm-simd";
import astronautJpegUrl from "./testing/astronaut-128.jpg?url";
import blankJpegUrl from "./testing/blank-128.jpg?url";
import chelseaJpegUrl from "./testing/chelsea-160.jpg?url";
import {
  FocusDetectionError,
  startFocusWorker,
  WorkerFocusDetector,
} from "./worker-focus-detector";

// chelsea-160.jpg is 160 × 106, letterboxed into the network's 416 px square input.
const CHELSEA_SIZE = { width: 160, height: 106 };
const INPUT_SIZE = 416;
const INPUT_PIXEL_TOLERANCE = 1;

/**
 * astronaut-128.jpg: NASA's public-domain portrait of Eileen Collins, as in find-focus.test.ts;
 * chelsea-160.jpg: Chelsea the cat, scikit-image's CC0 test picture (skimage/data/chelsea.png),
 * scaled to 160 × 106; the cat fills the picture.
 */
async function thumbnail(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

const workers: Worker[] = [];

function detector(startWorker: () => Worker = startFocusWorker): WorkerFocusDetector {
  return new WorkerFocusDetector(() => {
    const worker = startWorker();
    workers.push(worker);
    return worker;
  });
}

function startWorkerOn(runner: "js" | "wasm"): () => Worker {
  return runner === "js"
    ? () => new Worker(new URL("./testing/js-focus-worker.ts", import.meta.url), { type: "module" })
    : () =>
        new Worker(new URL("./testing/wasm-focus-worker.ts", import.meta.url), { type: "module" });
}

function objectBox(focus: PictureFocus): FocusBox {
  if (focus.kind !== "subject" || focus.foundBy !== "object") {
    throw new Error(`Expected an object subject, got ${JSON.stringify(focus)}`);
  }
  return focus.box;
}

// The box's edges in pixels of the network's input.
function inInputPixels({ x, y, width, height }: FocusBox): number[] {
  const scale = INPUT_SIZE / Math.max(CHELSEA_SIZE.width, CHELSEA_SIZE.height);
  const across = CHELSEA_SIZE.width * scale;
  const down = CHELSEA_SIZE.height * scale;
  return [x * across, y * down, (x + width) * across, (y + height) * down];
}

afterEach(() => {
  for (const worker of workers.splice(0)) worker.terminate();
});

describe("the focus worker", () => {
  it("finds the face in a portrait thumbnail", async () => {
    const focus = await detector().detect(await thumbnail(astronautJpegUrl));

    expect(focus.kind).toBe("subject");
  });

  it("measures the sharpness on screen only when handed the picture as shown", async () => {
    const portrait = await thumbnail(astronautJpegUrl);

    const measured = await detector().detect(portrait, portrait);
    const unmeasured = await detector().detect(portrait);

    expect(measured.sharpness).toBeGreaterThan(0);
    expect(unmeasured.sharpness).toBeUndefined();
  });

  it("finds the object in a thumbnail without a face", async () => {
    const focus = await detector().detect(await thumbnail(chelseaJpegUrl));

    expect(focus.kind).toBe("subject");
  });

  it("runs on an engine with WebAssembly SIMD, so the worker picks the Rust kernels", () => {
    expect(supportsWasmSimd()).toBe(true);
  });

  it("finds the cat's box within one input pixel on the Rust kernels and on TypeScript", async () => {
    const cat = await thumbnail(chelseaJpegUrl);
    const [onWasm, onJs] = await Promise.all([
      detector(startWorkerOn("wasm")).detect(cat),
      detector(startWorkerOn("js")).detect(cat),
    ]);

    const wasmEdges = inInputPixels(objectBox(onWasm));
    const jsEdges = inInputPixels(objectBox(onJs));
    for (const [index, edge] of wasmEdges.entries()) {
      expect(Math.abs(edge - (jsEdges[index] ?? Number.NaN))).toBeLessThanOrEqual(
        INPUT_PIXEL_TOLERANCE,
      );
    }
  });

  it("finds nothing in a blank thumbnail", async () => {
    const focus = await detector().detect(await thumbnail(blankJpegUrl));

    expect(focus).toEqual({ kind: "none" });
  });

  it("reports a thumbnail it cannot decode, and keeps working", async () => {
    const focusDetector = detector();

    await expect(focusDetector.detect(new Blob(["not a picture"]))).rejects.toThrow(
      FocusDetectionError,
    );
    await expect(focusDetector.detect(await thumbnail(blankJpegUrl))).resolves.toEqual({
      kind: "none",
    });
  });
});
