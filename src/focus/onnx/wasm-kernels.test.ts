import { beforeAll, describe, expect, it } from "vitest";
import { largestDifference, seededTensor } from "../testing/seeded-tensor";
import kernelsUrl from "./object-kernels.wasm?url&inline";
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
import { loadWasmKernels, type WasmKernels } from "./wasm-kernels";

// ADR-0060: each Rust kernel agrees with its TypeScript reference on the same tensors.
const TOLERANCE = 1e-4;
// Odd sizes, so the SIMD loops' scalar tails run too.
const SHAPE = [1, 3, 7, 11];

let kernels: WasmKernels;
beforeAll(async () => {
  kernels = await loadWasmKernels(await (await fetch(kernelsUrl)).arrayBuffer());
});

const agrees = (wasm: Tensor, reference: Tensor) => {
  expect(wasm.dims).toEqual(reference.dims);
  expect(largestDifference(wasm.data, reference.data)).toBeLessThan(TOLERANCE);
};

describe("the WASM element-wise kernels", () => {
  const a = seededTensor(SHAPE, 1, [-8, 8]);
  const b = seededTensor(SHAPE, 2, [-8, 8]);
  const wide = seededTensor(SHAPE, 3, [-120, 120]);

  it("add like the reference", () => agrees(kernels.add(a, b), add(a, b)));

  it("multiply like the reference", () => agrees(kernels.mul(a, b), mul(a, b)));

  it("take the sigmoid like the reference, far into both tails", () => {
    agrees(kernels.sigmoid(a), sigmoid(a));
    agrees(kernels.sigmoid(wide), sigmoid(wide));
  });

  it("fuse SiLU into the reference's Mul after Sigmoid", () => {
    agrees(kernels.silu(a), mul(a, sigmoid(a)));
    agrees(kernels.silu(wide), mul(wide, sigmoid(wide)));
  });

  it("refuse shapes they cannot combine, as the reference does", () => {
    const other = seededTensor([1, 3, 11, 7], 4, [-1, 1]);

    expect(() => kernels.add(a, other)).toThrow(RangeError);
  });

  it("free each call's tensors, so repeated calls do not grow the memory", () => {
    kernels.add(a, b);
    const used = kernels.bytesInUse();

    for (let round = 0; round < 50; round++) kernels.silu(kernels.mul(a, b));

    expect(kernels.bytesInUse()).toBe(used);
  });
});

describe("the WASM data-movement kernels", () => {
  const image = seededTensor([1, 3, 7, 11], 5, [-8, 8]);

  it("slice like the reference: strided, offset, clamped and negative windows", () => {
    for (const window of [
      { starts: [1, 0], ends: [7, 11], axes: [2, 3], steps: [2, 2] },
      { starts: [1], ends: [Number.MAX_SAFE_INTEGER], axes: [3], steps: [1] },
      { starts: [-5, 2], ends: [-1, 9], axes: [2, 3], steps: [1, 3] },
      { starts: [4], ends: [2], axes: [2], steps: [1] },
    ]) {
      agrees(kernels.slice(image, window), slice(image, window));
    }
  });

  it("concat like the reference along the channel and the last axis", () => {
    const other = seededTensor([1, 2, 7, 11], 6, [-8, 8]);
    const wider = seededTensor([1, 3, 7, 4], 7, [-8, 8]);

    agrees(kernels.concat([image, other], 1), concat([image, other], 1));
    agrees(kernels.concat([image, wider, image], 3), concat([image, wider, image], 3));
  });

  it("reshape like the reference, filling in a -1 dimension", () => {
    agrees(kernels.reshape(image, [1, 3, -1]), reshape(image, [1, 3, -1]));
    expect(() => kernels.reshape(image, [2, 3])).toThrow(RangeError);
  });

  it("transpose like the reference", () => {
    for (const permutation of [
      [0, 2, 1, 3],
      [3, 2, 1, 0],
      [0, 1, 3, 2],
    ]) {
      agrees(kernels.transpose(image, permutation), transpose(image, permutation));
    }
  });

  it("resize like the reference by integer scales", () => {
    agrees(kernels.resizeNearest(image, [1, 1, 2, 2]), resizeNearest(image, [1, 1, 2, 2]));
    agrees(kernels.resizeNearest(image, [1, 1, 3, 2]), resizeNearest(image, [1, 1, 3, 2]));
    expect(() => kernels.resizeNearest(image, [1, 1, 1.5, 2])).toThrow(RangeError);
  });

  it("max-pool like the reference, padded and strided", () => {
    for (const window of [
      { kernel: [5, 5], strides: [1, 1], pads: [2, 2, 2, 2] },
      { kernel: [3, 2], strides: [2, 3], pads: [1, 0, 1, 0] },
      { kernel: [2, 2], strides: [2, 2], pads: [0, 0, 0, 0] },
    ] as const) {
      agrees(kernels.maxPool(image, window), maxPool(image, window));
    }
  });

  it("free each call's tensors, so repeated calls do not grow the memory", () => {
    kernels.transpose(image, [0, 2, 1, 3]);
    const used = kernels.bytesInUse();

    for (let round = 0; round < 50; round++) {
      kernels.concat([kernels.slice(image, { starts: [1], ends: [5], axes: [2], steps: [1] })], 1);
    }

    expect(kernels.bytesInUse()).toBe(used);
  });
});

describe("the WASM convolution kernels", () => {
  const image = seededTensor([1, 6, 9, 13], 8, [-2, 2]);
  const padded = { group: 1, strides: [1, 1], pads: [1, 1, 1, 1] } as const;

  it("convolve 3×3 like the reference, padded and strided, with and without a bias", () => {
    const kernel = seededTensor([5, 6, 3, 3], 9, [-1, 1]);
    const bias = seededTensor([5], 10, [-1, 1]);

    agrees(kernels.conv(image, kernel, bias, padded), conv(image, kernel, bias, padded));
    for (const attributes of [
      { group: 1, strides: [2, 2], pads: [1, 1, 1, 1] },
      { group: 1, strides: [2, 1], pads: [0, 1, 1, 0] },
    ] as const) {
      agrees(
        kernels.conv(image, kernel, undefined, attributes),
        conv(image, kernel, undefined, attributes),
      );
    }
  });

  it("convolve depthwise like the reference, each channel with its own kernel", () => {
    const kernel = seededTensor([6, 1, 3, 3], 11, [-1, 1]);
    const bias = seededTensor([6], 12, [-1, 1]);

    for (const strides of [
      [1, 1],
      [2, 2],
    ] as const) {
      const attributes = { group: 6, strides, pads: [1, 1, 1, 1] } as const;
      agrees(kernels.conv(image, kernel, bias, attributes), conv(image, kernel, bias, attributes));
    }
  });

  it("convolve 1×1 like the reference, over output channels that leave a partial block", () => {
    const pointwise = { group: 1, strides: [1, 1], pads: [0, 0, 0, 0] } as const;
    const wide = seededTensor([1, 37, 23, 29], 13, [-2, 2]);
    const kernel = seededTensor([11, 37, 1, 1], 14, [-1, 1]);
    const bias = seededTensor([11], 15, [-1, 1]);

    agrees(kernels.conv(wide, kernel, bias, pointwise), conv(wide, kernel, bias, pointwise));
    agrees(
      kernels.conv(wide, kernel, undefined, { ...pointwise, strides: [2, 2] }),
      conv(wide, kernel, undefined, { ...pointwise, strides: [2, 2] }),
    );
    const grouped = seededTensor([6, 3, 1, 1], 16, [-1, 1]);
    agrees(
      kernels.conv(image, grouped, undefined, { ...pointwise, group: 2 }),
      conv(image, grouped, undefined, { ...pointwise, group: 2 }),
    );
  });

  it("refuse a kernel that does not fit the input, as the reference does", () => {
    const kernel = seededTensor([4, 5, 3, 3], 17, [-1, 1]);

    expect(() => kernels.conv(image, kernel, undefined, padded)).toThrow(RangeError);
  });

  it("refuse a bias that is not one value per output channel", () => {
    const kernel = seededTensor([5, 6, 3, 3], 19, [-1, 1]);
    const short = seededTensor([4], 20, [-1, 1]);

    expect(kernels.conv(image, kernel, undefined, padded).dims).toEqual([1, 5, 9, 13]);
    expect(() => kernels.conv(image, kernel, short, padded)).toThrow(RangeError);
  });

  it("free each call's tensors, so repeated calls do not grow the memory", () => {
    const kernel = seededTensor([6, 1, 3, 3], 18, [-1, 1]);
    const depthwise = { ...padded, group: 6 };
    kernels.conv(image, kernel, undefined, depthwise);
    const used = kernels.bytesInUse();

    for (let round = 0; round < 50; round++) kernels.conv(image, kernel, undefined, depthwise);

    expect(kernels.bytesInUse()).toBe(used);
  });
});
