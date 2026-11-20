// The network's SiLU is a Sigmoid and a Mul of its input with its output; the WASM runner does
// both in one pass (ADR-0060).
import { item } from "./item";
import type { OnnxNode } from "./onnx-model";
import { SILU } from "./run-onnx";

/** The nodes with each `Mul(x, Sigmoid(x))`, whose Sigmoid nothing else reads, as one SiLU. */
export function fuseSilu(nodes: readonly OnnxNode[]): OnnxNode[] {
  const readers = new Map<string, number>();
  for (const name of nodes.flatMap((node) => node.inputs)) {
    readers.set(name, (readers.get(name) ?? 0) + 1);
  }
  const sigmoidInputs = new Map<string, string>();
  for (const node of nodes) {
    const output = item(node.outputs, 0);
    if (node.op === "Sigmoid" && readers.get(output) === 1) {
      sigmoidInputs.set(output, item(node.inputs, 0));
    }
  }
  const fusedSigmoids = new Set<string>();
  const fused = nodes.map((node) => {
    if (node.op !== "Mul") return node;
    const [a, b] = node.inputs as [string, string];
    const sigmoidOf = (sigmoid: string, input: string) => sigmoidInputs.get(sigmoid) === input;
    const [input, sigmoid] = sigmoidOf(b, a) ? [a, b] : sigmoidOf(a, b) ? [b, a] : [];
    if (input === undefined || sigmoid === undefined) return node;
    fusedSigmoids.add(sigmoid);
    return { ...node, op: SILU, inputs: [input] };
  });
  return fused.filter((node) => node.op !== "Sigmoid" || !fusedSigmoids.has(item(node.outputs, 0)));
}
