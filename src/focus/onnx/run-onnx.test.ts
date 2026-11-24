import { describe, expect, it } from "vitest";
import type { OnnxNode } from "./onnx-model";
import { walkGraph, type Operators } from "./run-onnx";

const node = (op: string, inputs: string[], output: string): OnnxNode => ({
  op,
  inputs,
  outputs: [output],
  attributes: new Map(),
});

// A value is the name of the node that made it; the operators record what the walk releases.
function recordingOperators(released: string[]): Operators<string> {
  const unsupported = () => {
    throw new Error("not in this graph");
  };
  return {
    add: (a, b) => `add(${a},${b})`,
    mul: (a, b) => `mul(${a},${b})`,
    sigmoid: (input) => `sigmoid(${input})`,
    silu: unsupported,
    conv: unsupported,
    maxPool: unsupported,
    resizeNearest: unsupported,
    slice: unsupported,
    concat: unsupported,
    reshape: unsupported,
    transpose: unsupported,
    values: unsupported,
    release: (tensor) => released.push(tensor),
  };
}

describe("walkGraph", () => {
  it("releases each activation once, right after its last reader, and never a weight", () => {
    const released: string[] = [];
    const graph = {
      nodes: [
        node("Sigmoid", ["x"], "s"),
        node("Add", ["s", "w"], "a"),
        node("Mul", ["a", "a"], "m"),
        node("Add", ["m", "s"], "out"),
      ],
      weights: new Map([["w", "w"]]),
      inputName: "x",
      outputName: "out",
    };

    const output = walkGraph(graph, "x", recordingOperators(released));

    expect(output).toBe("add(mul(add(sigmoid(x),w),add(sigmoid(x),w)),sigmoid(x))");
    expect(released).toEqual([
      "x",
      "add(sigmoid(x),w)",
      "mul(add(sigmoid(x),w),add(sigmoid(x),w))",
      "sigmoid(x)",
    ]);
  });
});
