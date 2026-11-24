// Runs a parsed ONNX graph one node after the other on the CPU. Only the operators of
// `tensor-ops.ts` exist; a graph with another one fails loud (ADR-0036).
import { item } from "./item";
import type { OnnxGraph, OnnxNode } from "./onnx-model";
import * as reference from "./tensor-ops";
import type { ConvAttributes, PoolAttributes, SliceAttributes, Tensor } from "./tensor-ops";

/** The operators a graph walk needs, over tensors of type `T` wherever they live. */
export interface Operators<T> {
  conv(input: T, kernel: T, bias: T | undefined, attributes: ConvAttributes): T;
  maxPool(input: T, attributes: PoolAttributes): T;
  resizeNearest(input: T, scales: readonly number[]): T;
  slice(input: T, attributes: SliceAttributes): T;
  concat(inputs: readonly T[], axis: number): T;
  reshape(input: T, shape: readonly number[]): T;
  transpose(input: T, permutation: readonly number[]): T;
  add(a: T, b: T): T;
  mul(a: T, b: T): T;
  sigmoid(input: T): T;
  /** `x * sigmoid(x)`: the node `fuseSilu` makes of a Mul after a Sigmoid. */
  silu(input: T): T;
  /** A small tensor's values, the parameters of Slice, Resize and Reshape. */
  values(tensor: T): number[];
  /** Frees a tensor no node reads any more. */
  release(tensor: T): void;
}

/** The graph's nodes in order; a value is `T` (a weight, the input or a node's output). */
export interface GraphWalk<T> {
  readonly nodes: readonly OnnxNode[];
  readonly weights: ReadonlyMap<string, T>;
  readonly inputName: string;
  readonly outputName: string;
}

export const SILU = "SiLU";

type Pads = readonly [number, number, number, number];
type Pair = readonly [number, number];

const referenceOperators: Operators<Tensor> = {
  ...reference,
  silu: (input) => reference.mul(input, reference.sigmoid(input)),
  values: (tensor) => [...tensor.data],
  release: () => undefined,
};

/** Runs the graph on its one input and returns its one output. */
export function runOnnx(graph: OnnxGraph, input: Tensor): Tensor {
  return walkGraph(graph, input, referenceOperators);
}

export function walkGraph<T>(graph: GraphWalk<T>, input: T, operators: Operators<T>): T {
  const values = new Map<string, T>(graph.weights);
  values.set(graph.inputName, input);
  const lastUse = lastUses(graph.nodes);
  graph.nodes.forEach((node, index) => {
    const args = node.inputs.map((name) => {
      const value = values.get(name);
      if (value === undefined)
        throw new Error(`${node.op} reads ${name}, which nothing has computed`);
      return value;
    });
    values.set(item(node.outputs, 0), execute(node, args, operators));
    // The activations of a network this size are the memory that matters; the weights stay.
    for (const name of new Set(node.inputs)) {
      if (lastUse.get(name) !== index || graph.weights.has(name)) continue;
      operators.release(values.get(name) as T);
      values.delete(name);
    }
  });
  const output = values.get(graph.outputName);
  if (output === undefined)
    throw new Error(`The graph never computes its output ${graph.outputName}`);
  return output;
}

function lastUses(nodes: readonly OnnxNode[]): Map<string, number> {
  const last = new Map<string, number>();
  nodes.forEach((node, index) => node.inputs.forEach((name) => last.set(name, index)));
  return last;
}

function execute<T>(node: OnnxNode, args: readonly T[], operators: Operators<T>): T {
  const [first, second, third] = args as [T, T, T];
  const ints = (name: string) => node.attributes.get(name) as readonly number[];
  const values = (index: number) => operators.values(item(args, index));
  switch (node.op) {
    case "Conv":
      return operators.conv(first, second, third, {
        group: node.attributes.get("group") as number,
        strides: ints("strides") as Pair,
        pads: ints("pads") as Pads,
      });
    case "MaxPool":
      return operators.maxPool(first, {
        kernel: ints("kernel_shape") as Pair,
        strides: ints("strides") as Pair,
        pads: ints("pads") as Pads,
      });
    case "Resize":
      return operators.resizeNearest(first, values(2));
    case "Slice":
      return operators.slice(first, {
        starts: values(1),
        ends: values(2),
        axes: values(3),
        steps: values(4),
      });
    case "Concat":
      return operators.concat(args, node.attributes.get("axis") as number);
    case "Reshape":
      return operators.reshape(first, values(1));
    case "Transpose":
      return operators.transpose(first, ints("perm"));
    case "Add":
      return operators.add(first, second);
    case "Mul":
      return operators.mul(first, second);
    case "Sigmoid":
      return operators.sigmoid(first);
    case SILU:
      return operators.silu(first);
    default:
      throw new Error(`The ONNX operator ${node.op} is not supported`);
  }
}
