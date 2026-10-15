// Runs a parsed ONNX graph one node after the other on the CPU. Only the operators of
// `tensor-ops.ts` exist; a graph with another one fails loud (ADR-0036).
import { item } from "./item";
import type { OnnxGraph, OnnxNode } from "./onnx-model";
import {
  add,
  concat,
  conv,
  maxPool,
  mul,
  reshape,
  resizeNearest,
  sigmoid,
  slice,
  transpose,
  type Tensor,
} from "./tensor-ops";

type Pads = readonly [number, number, number, number];
type Pair = readonly [number, number];

/** Runs the graph on its one input and returns its one output. */
export function runOnnx(graph: OnnxGraph, input: Tensor): Tensor {
  const values = new Map<string, Tensor>(graph.weights);
  values.set(graph.inputName, input);
  const lastUse = lastUses(graph);
  graph.nodes.forEach((node, index) => {
    const args = node.inputs.map((name) => {
      const value = values.get(name);
      if (!value) throw new Error(`${node.op} reads ${name}, which nothing has computed`);
      return value;
    });
    values.set(item(node.outputs, 0), execute(node, args));
    // The activations of a network this size are the memory that matters; the weights stay.
    for (const name of node.inputs) {
      if (lastUse.get(name) === index && !graph.weights.has(name)) values.delete(name);
    }
  });
  const output = values.get(graph.outputName);
  if (!output) throw new Error(`The graph never computes its output ${graph.outputName}`);
  return output;
}

function lastUses(graph: OnnxGraph): Map<string, number> {
  const last = new Map<string, number>();
  graph.nodes.forEach((node, index) => node.inputs.forEach((name) => last.set(name, index)));
  return last;
}

function execute(node: OnnxNode, args: readonly Tensor[]): Tensor {
  const [first, second, third] = args as [Tensor, Tensor, Tensor];
  const ints = (name: string) => node.attributes.get(name) as readonly number[];
  switch (node.op) {
    case "Conv":
      return conv(first, second, third, {
        group: node.attributes.get("group") as number,
        strides: ints("strides") as Pair,
        pads: ints("pads") as Pads,
      });
    case "MaxPool":
      return maxPool(first, {
        kernel: ints("kernel_shape") as Pair,
        strides: ints("strides") as Pair,
        pads: ints("pads") as Pads,
      });
    case "Resize":
      return resizeNearest(first, [...third.data]);
    case "Slice":
      return slice(first, {
        starts: [...second.data],
        ends: [...third.data],
        axes: [...item(args, 3).data],
        steps: [...item(args, 4).data],
      });
    case "Concat":
      return concat(args, node.attributes.get("axis") as number);
    case "Reshape":
      return reshape(first, [...second.data]);
    case "Transpose":
      return transpose(first, ints("perm"));
    case "Add":
      return add(first, second);
    case "Mul":
      return mul(first, second);
    case "Sigmoid":
      return sigmoid(first);
    default:
      throw new Error(`The ONNX operator ${node.op} is not supported`);
  }
}
