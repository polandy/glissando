import type { ObjectNetwork } from "../object-focus";
import type { OnnxGraph } from "./onnx-model";
import { messageOf } from "../post-reply";
import { runOnnx } from "./run-onnx";

/**
 * What runs the object network: the Rust kernels (ADR-0060), or the TypeScript interpreter with
 * the reason it was the fallback.
 */
type ObjectRunner =
  | { readonly kind: "wasm"; readonly network: ObjectNetwork }
  | { readonly kind: "js"; readonly network: ObjectNetwork; readonly reason: string };

interface RunnerChoice {
  readonly simdSupported: boolean;
  readonly loadWasm: (graph: OnnxGraph) => Promise<ObjectNetwork>;
}

/** The Rust kernels when the engine has SIMD and they load; otherwise the TypeScript runner. */
export async function chooseObjectRunner(
  graph: OnnxGraph,
  { simdSupported, loadWasm }: RunnerChoice,
): Promise<ObjectRunner> {
  if (!simdSupported) return jsRunner(graph, "WebAssembly SIMD is not supported");
  try {
    return { kind: "wasm", network: await loadWasm(graph) };
  } catch (error) {
    return jsRunner(graph, messageOf(error));
  }
}

function jsRunner(graph: OnnxGraph, reason: string): ObjectRunner {
  return { kind: "js", network: (input) => runOnnx(graph, input), reason };
}
