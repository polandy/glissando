import { describe, expect, it } from "vitest";
import { fuseSilu } from "./fuse-silu";
import type { OnnxNode } from "./onnx-model";

const node = (op: string, inputs: string[], output: string): OnnxNode => ({
  op,
  inputs,
  outputs: [output],
  attributes: new Map(),
});

const ops = (nodes: readonly OnnxNode[]) =>
  nodes.map(({ op, inputs, outputs }) => `${op}(${inputs.join()})->${outputs.join()}`);

describe("fuseSilu", () => {
  it("fuses a Mul of a value and its Sigmoid into one SiLU, in either operand order", () => {
    const nodes = [
      node("Conv", ["x", "w"], "a"),
      node("Sigmoid", ["a"], "s"),
      node("Mul", ["a", "s"], "m"),
      node("Sigmoid", ["m"], "t"),
      node("Mul", ["t", "m"], "out"),
    ];

    expect(ops(fuseSilu(nodes))).toEqual(["Conv(x,w)->a", "SiLU(a)->m", "SiLU(m)->out"]);
  });

  it("keeps a Sigmoid whose output another node reads too", () => {
    const nodes = [
      node("Sigmoid", ["a"], "s"),
      node("Mul", ["a", "s"], "m"),
      node("Add", ["s", "m"], "out"),
    ];

    expect(ops(fuseSilu(nodes))).toEqual(ops(nodes));
  });

  it("keeps a Mul of a Sigmoid and some other value", () => {
    const nodes = [node("Sigmoid", ["a"], "s"), node("Mul", ["b", "s"], "out")];

    expect(ops(fuseSilu(nodes))).toEqual(ops(nodes));
  });
});
