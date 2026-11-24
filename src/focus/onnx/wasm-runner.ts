// The object network on the Rust kernels (ADR-0060): the weights are copied into the module
// once, and every run allocates its activations above them, each released after its last reader.
import { fuseSilu } from "./fuse-silu";
import type { OnnxGraph } from "./onnx-model";
import { walkGraph } from "./run-onnx";
import type { Tensor } from "./tensor-ops";
import { instantiateKernels } from "./wasm-module";
import { arenaOperators, hosted, readOut, toArena, type ArenaTensor } from "./wasm-operators";

export interface WasmNetwork {
  (input: Tensor): Tensor;
  /** How far the arena reaches into the module's memory, in bytes. */
  bytesInUse(): number;
  /** The module's memory: it grows to the largest run's peak and never shrinks. */
  bytesReserved(): number;
}

export async function loadWasmNetwork(
  graph: OnnxGraph,
  kernels: BufferSource,
): Promise<WasmNetwork> {
  const module = await instantiateKernels(kernels);
  const operators = arenaOperators(module);
  const weights = new Map<string, ArenaTensor>();
  for (const [name, weight] of graph.weights) weights.set(name, toArena(module, weight));
  const walk = { ...graph, nodes: fuseSilu(graph.nodes), weights };
  const run = (input: Tensor): Tensor =>
    hosted(module, () => readOut(module, walkGraph(walk, toArena(module, input), operators)));
  return Object.assign(run, {
    bytesInUse: () => module.arena_mark(),
    bytesReserved: () => module.memory.buffer.byteLength,
  });
}
