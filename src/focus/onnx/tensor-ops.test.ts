import { describe, expect, it } from "vitest";
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

const tensor = (dims: number[], values: number[]): Tensor => ({
  dims,
  data: Float32Array.from(values),
});

describe("conv", () => {
  it("sums the kernel over each input position, padded with zeros", () => {
    const input = tensor([1, 1, 2, 2], [1, 2, 3, 4]);
    const kernel = tensor([1, 1, 3, 3], [0, 0, 0, 0, 1, 0, 0, 0, 1]);

    const out = conv(input, kernel, undefined, { group: 1, strides: [1, 1], pads: [1, 1, 1, 1] });

    expect(out.dims).toEqual([1, 1, 2, 2]);
    expect([...out.data]).toEqual([1 + 4, 2, 3, 4]);
  });

  it("adds the bias of each output channel", () => {
    const input = tensor([1, 1, 1, 1], [2]);
    const kernel = tensor([2, 1, 1, 1], [3, 5]);
    const bias = tensor([2], [10, 20]);

    const out = conv(input, kernel, bias, { group: 1, strides: [1, 1], pads: [0, 0, 0, 0] });

    expect([...out.data]).toEqual([16, 30]);
  });

  it("steps by the stride", () => {
    const input = tensor(
      [1, 1, 4, 4],
      Array.from({ length: 16 }, (_, index) => index),
    );
    const kernel = tensor([1, 1, 1, 1], [1]);

    const out = conv(input, kernel, undefined, { group: 1, strides: [2, 2], pads: [0, 0, 0, 0] });

    expect(out.dims).toEqual([1, 1, 2, 2]);
    expect([...out.data]).toEqual([0, 2, 8, 10]);
  });

  it("convolves each channel on its own when the group is the channel count", () => {
    const input = tensor([1, 2, 1, 1], [1, 10]);
    const kernel = tensor([2, 1, 1, 1], [2, 3]);

    const out = conv(input, kernel, undefined, { group: 2, strides: [1, 1], pads: [0, 0, 0, 0] });

    expect([...out.data]).toEqual([2, 30]);
  });
});

describe("maxPool", () => {
  it("takes the largest value under the window, ignoring the padding", () => {
    const input = tensor([1, 1, 2, 2], [-5, -1, -3, -2]);

    const out = maxPool(input, { kernel: [3, 3], strides: [1, 1], pads: [1, 1, 1, 1] });

    expect([...out.data]).toEqual([-1, -1, -1, -1]);
  });
});

describe("resizeNearest", () => {
  it("repeats each value by the scale", () => {
    const input = tensor([1, 1, 1, 2], [1, 2]);

    const out = resizeNearest(input, [1, 1, 2, 2]);

    expect(out.dims).toEqual([1, 1, 2, 4]);
    expect([...out.data]).toEqual([1, 1, 2, 2, 1, 1, 2, 2]);
  });
});

describe("slice", () => {
  it("takes every other row and column from an offset, as the focus layer does", () => {
    const input = tensor(
      [1, 1, 4, 4],
      Array.from({ length: 16 }, (_, index) => index),
    );

    const out = slice(input, { starts: [1, 0], ends: [4, 4], axes: [2, 3], steps: [2, 2] });

    expect(out.dims).toEqual([1, 1, 2, 2]);
    expect([...out.data]).toEqual([4, 6, 12, 14]);
  });

  it("clamps an end past the size", () => {
    const input = tensor([1, 1, 1, 3], [7, 8, 9]);

    const out = slice(input, {
      starts: [1],
      ends: [Number.MAX_SAFE_INTEGER],
      axes: [3],
      steps: [1],
    });

    expect([...out.data]).toEqual([8, 9]);
  });
});

describe("concat", () => {
  it("joins along the channel axis", () => {
    const first = tensor([1, 1, 1, 2], [1, 2]);
    const second = tensor([1, 2, 1, 2], [3, 4, 5, 6]);

    const out = concat([first, second], 1);

    expect(out.dims).toEqual([1, 3, 1, 2]);
    expect([...out.data]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("joins along the last axis by interleaving the rows", () => {
    const first = tensor([2, 1], [1, 2]);
    const second = tensor([2, 2], [3, 4, 5, 6]);

    const out = concat([first, second], 1);

    expect([...out.data]).toEqual([1, 3, 4, 2, 5, 6]);
  });
});

describe("reshape and transpose", () => {
  it("reshape keeps the data and fills in a -1 dimension", () => {
    const out = reshape(tensor([2, 3], [1, 2, 3, 4, 5, 6]), [1, 3, -1]);

    expect(out.dims).toEqual([1, 3, 2]);
    expect([...out.data]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("transpose permutes the axes", () => {
    const out = transpose(tensor([1, 2, 3], [1, 2, 3, 4, 5, 6]), [0, 2, 1]);

    expect(out.dims).toEqual([1, 3, 2]);
    expect([...out.data]).toEqual([1, 4, 2, 5, 3, 6]);
  });
});

describe("element-wise", () => {
  it("adds and multiplies same-shaped tensors", () => {
    const a = tensor([2], [2, 3]);
    const b = tensor([2], [4, 5]);

    expect([...add(a, b).data]).toEqual([6, 8]);
    expect([...mul(a, b).data]).toEqual([8, 15]);
  });

  it("refuses shapes it cannot combine", () => {
    expect(() => add(tensor([2], [1, 2]), tensor([3], [1, 2, 3]))).toThrow(RangeError);
  });

  it("sigmoid maps 0 to one half", () => {
    expect(sigmoid(tensor([1], [0])).data[0]).toBeCloseTo(0.5, 6);
  });
});
