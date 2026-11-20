// The object network on the Rust kernels (ADR-0060): the weights are copied into the module
// once, and every run allocates its activations above them, freed when the run ends.
import { fuseSilu } from "./fuse-silu";
import type { OnnxGraph } from "./onnx-model";
import { walkGraph } from "./run-onnx";
import type { Tensor } from "./tensor-ops";
import { hosted, readOut, toArena } from "./wasm-kernels";
import { instantiateKernels } from "./wasm-module";
import { arenaOperators, type ArenaTensor } from "./wasm-operators";

export interface WasmNetwork {
  (input: Tensor): Tensor;
  /** How far the arena reaches into the module's memory, in bytes. */
  bytesInUse(): number;
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
  return Object.assign(run, { bytesInUse: () => module.arena_mark() });
}
