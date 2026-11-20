// The focus worker's entry: the object network runs on the Rust kernels where the engine has
// WebAssembly SIMD, on the TypeScript runner otherwise (ADR-0060).
import { chooseObjectRunner } from "./onnx/object-runner";
import kernelsUrl from "./onnx/object-kernels.wasm?url";
import { supportsWasmSimd } from "./onnx/wasm-simd";
import { loadWasmNetwork } from "./onnx/wasm-runner";
import { download, serveFocusRequests } from "./serve-focus-requests";

serveFocusRequests(async (graph) => {
  const runner = await chooseObjectRunner(graph, {
    simdSupported: supportsWasmSimd(),
    loadWasm: async (walk) => loadWasmNetwork(walk, await download(kernelsUrl, "object kernels")),
  });
  if (runner.kind === "js") console.warn(`The object network runs on TypeScript: ${runner.reason}`);
  return runner.network;
});
