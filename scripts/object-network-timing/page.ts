// The page run.mjs drives: loads the object network once per runner and times single runs.
import networkUrl from "../../src/focus/yolox-nano.bin?url";
import kernelsUrl from "../../src/focus/onnx/object-kernels.wasm?url";
import type { ObjectNetwork } from "../../src/focus/object-focus";
import { parseOnnx } from "../../src/focus/onnx/onnx-model";
import { runOnnx } from "../../src/focus/onnx/run-onnx";
import { supportsWasmSimd } from "../../src/focus/onnx/wasm-simd";
import { loadWasmNetwork } from "../../src/focus/onnx/wasm-runner";
import { seededTensor } from "../../src/focus/testing/seeded-tensor";

const INPUT_DIMS = [1, 3, 416, 416];
const INPUT_SEED = 1;
const INPUT_RANGE = [0, 255] as const;

type Runner = "wasm" | "js";

async function bytesOf(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} did not load: HTTP ${response.status}`);
  return response.arrayBuffer();
}

async function network(runner: Runner): Promise<ObjectNetwork> {
  const graph = parseOnnx(new Uint8Array(await bytesOf(networkUrl)));
  if (runner === "js") return (input) => runOnnx(graph, input);
  if (!supportsWasmSimd()) throw new Error("This browser has no WebAssembly SIMD");
  return loadWasmNetwork(graph, await bytesOf(kernelsUrl));
}

/** Milliseconds of each of `runs` runs of one 416 px picture; a first run warms the module up. */
async function timeRuns(runner: Runner, runs: number): Promise<number[]> {
  const run = await network(runner);
  const input = seededTensor(INPUT_DIMS, INPUT_SEED, INPUT_RANGE);
  run(input);
  return Array.from({ length: runs }, () => {
    const start = performance.now();
    run(input);
    return performance.now() - start;
  });
}

Object.assign(window, { timeRuns });
