// The focus worker with the object network forced onto the Rust kernels, no fallback, for tests.
import kernelsUrl from "../onnx/object-kernels.wasm?url";
import { loadWasmNetwork } from "../onnx/wasm-runner";
import { download, serveFocusRequests } from "../serve-focus-requests";

serveFocusRequests(async (graph) =>
  loadWasmNetwork(graph, await download(kernelsUrl, "object kernels")),
);
