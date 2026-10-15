import { beforeAll, describe, expect, it } from "vitest";
import modelDataUrl from "../yolox-nano.bin?url&inline";
import { item } from "./item";
import { parseOnnx, type OnnxGraph } from "./onnx-model";

let graph: OnnxGraph;

beforeAll(async () => {
  graph = parseOnnx(new Uint8Array(await (await fetch(modelDataUrl)).arrayBuffer()));
});

describe("parseOnnx", () => {
  it("names the network's input and output", () => {
    expect([graph.inputName, graph.outputName]).toEqual(["images", "output"]);
  });

  it("reads every node with its operator", () => {
    const count = (op: string) => graph.nodes.filter((node) => node.op === op).length;

    expect([graph.nodes.length, count("Conv"), count("Sigmoid"), count("Resize")]).toEqual([
      // 8 + 18 + 113 + 110 + 104 + 7 + 3 + 2 + 3 + 1 nodes, per operator type of the model.
      369, 113, 110, 2,
    ]);
  });

  it("reads a node's integer attributes", () => {
    const depthwise = graph.nodes.find((node) => node.attributes.get("group") === 16);

    expect(depthwise?.attributes.get("strides")).toEqual([2, 2]);
    expect(depthwise?.attributes.get("pads")).toEqual([1, 1, 1, 1]);
  });

  it("reads float and integer weights with their shapes", () => {
    const resize = graph.nodes.find((node) => node.op === "Resize");
    const scales = graph.weights.get(item(resize?.inputs ?? [], 2));
    if (!scales) throw new Error("expected the resize scales");

    expect([scales.dims, [...scales.data]]).toEqual([[4], [1, 1, 2, 2]]);
    expect(graph.weights.size).toBe(236);
  });

  it("refuses bytes that are not a model", () => {
    expect(() => parseOnnx(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
