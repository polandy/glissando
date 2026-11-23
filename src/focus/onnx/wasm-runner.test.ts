import { beforeAll, describe, expect, it } from "vitest";
import { largestDifference, seededTensor } from "../testing/seeded-tensor";
import modelDataUrl from "../yolox-nano.bin?url&inline";
import kernelsUrl from "./object-kernels.wasm?url&inline";
import { parseOnnx, type OnnxGraph } from "./onnx-model";
import { runOnnx } from "./run-onnx";
import type { Tensor } from "./tensor-ops";
import { loadWasmNetwork, type WasmNetwork } from "./wasm-runner";

// ADR-0060: the whole network through the Rust kernels agrees with the TypeScript runner.
const TOLERANCE = 1e-4;
const INPUT_DIMS = [1, 3, 416, 416];
const PIXEL_RANGE = [0, 255] as const;
// A run peaks at 22.7 MB, 4.7 MB of it weights.
const PEAK_BUDGET_BYTES = 24 * 1024 * 1024;

let kernelBytes: ArrayBuffer;
let graph: OnnxGraph;
let network: WasmNetwork;
let input: Tensor;
let reference: Tensor;

beforeAll(async () => {
  kernelBytes = await (await fetch(kernelsUrl)).arrayBuffer();
  graph = parseOnnx(new Uint8Array(await (await fetch(modelDataUrl)).arrayBuffer()));
  network = await loadWasmNetwork(graph, kernelBytes);
  input = seededTensor(INPUT_DIMS, 1, PIXEL_RANGE);
  reference = runOnnx(graph, input);
});

describe("the WASM object network", () => {
  it("computes the network's output like the TypeScript runner", () => {
    const output = network(input);

    expect(output.dims).toEqual(reference.dims);
    expect(largestDifference(output.data, reference.data)).toBeLessThan(TOLERANCE);
  });

  it("resets its arena on every run, so the memory in use stays that of the weights", () => {
    const weightsOnly = network.bytesInUse();
    const first = network(input);

    expect(network.bytesInUse()).toBe(weightsOnly);
    expect(network(seededTensor(INPUT_DIMS, 2, PIXEL_RANGE)).data).not.toEqual(first.data);
    expect(network(input).data).toEqual(first.data);
    expect(network.bytesInUse()).toBe(weightsOnly);
  });

  it("frees each activation after its last reader, so a run's peak stays within budget", async () => {
    const fresh = await loadWasmNetwork(graph, kernelBytes);

    fresh(input);

    expect(fresh.bytesReserved()).toBeLessThanOrEqual(PEAK_BUDGET_BYTES);
  });

  it("holds the weights once, not again per run", () => {
    const weightBytes = [...graph.weights.values()].reduce(
      (total, weight) => total + weight.data.byteLength,
      0,
    );

    expect(network.bytesInUse()).toBeGreaterThanOrEqual(weightBytes);
    expect(network.bytesInUse()).toBeLessThan(2 * weightBytes);
  });

  it("fails loud on an operator it has no kernel for, and frees that run's tensors", async () => {
    const unknown = { op: "Softmax", inputs: [graph.inputName], outputs: ["soft"] };
    const broken = await loadWasmNetwork(
      { ...graph, nodes: [{ ...unknown, attributes: new Map() }], outputName: "soft" },
      kernelBytes,
    );
    const weightsOnly = broken.bytesInUse();

    expect(() => broken(input)).toThrow(/Softmax/);
    expect(broken.bytesInUse()).toBe(weightsOnly);
  });
});
