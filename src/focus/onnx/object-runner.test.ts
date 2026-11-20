import { describe, expect, it } from "vitest";
import { runOnnx } from "./run-onnx";
import type { OnnxGraph } from "./onnx-model";
import type { Tensor } from "./tensor-ops";
import { chooseObjectRunner } from "./object-runner";

const SIGMOID_GRAPH: OnnxGraph = {
  nodes: [{ op: "Sigmoid", inputs: ["in"], outputs: ["out"], attributes: new Map() }],
  weights: new Map(),
  inputName: "in",
  outputName: "out",
};
const INPUT: Tensor = { dims: [1, 3], data: new Float32Array([-1, 0, 2]) };
const WASM_OUTPUT: Tensor = { dims: [1], data: new Float32Array([42]) };
const wasmNetwork = (): Tensor => WASM_OUTPUT;

describe("the object runner choice (ADR-0060)", () => {
  it("runs the network on the Rust kernels when the SIMD probe passes and they load", async () => {
    const runner = await chooseObjectRunner(SIGMOID_GRAPH, {
      simdSupported: true,
      loadWasm: () => Promise.resolve(wasmNetwork),
    });

    expect(runner.kind).toBe("wasm");
    expect(runner.network(INPUT)).toBe(WASM_OUTPUT);
  });

  it("falls back to the TypeScript runner without loading the kernels when the probe fails", async () => {
    let loads = 0;
    const runner = await chooseObjectRunner(SIGMOID_GRAPH, {
      simdSupported: false,
      loadWasm: () => {
        loads += 1;
        return Promise.resolve(wasmNetwork);
      },
    });

    expect(runner).toMatchObject({ kind: "js", reason: "WebAssembly SIMD is not supported" });
    expect(runner.network(INPUT)).toEqual(runOnnx(SIGMOID_GRAPH, INPUT));
    expect(loads).toBe(0);
  });

  it("falls back to the TypeScript runner when the kernels fail to load", async () => {
    const runner = await chooseObjectRunner(SIGMOID_GRAPH, {
      simdSupported: true,
      loadWasm: () => Promise.reject(new Error("The object kernels lack conv")),
    });

    expect(runner).toMatchObject({ kind: "js", reason: "The object kernels lack conv" });
    expect(runner.network(INPUT)).toEqual(runOnnx(SIGMOID_GRAPH, INPUT));
  });
});
