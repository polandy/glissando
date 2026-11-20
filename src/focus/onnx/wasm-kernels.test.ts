import { beforeAll, describe, expect, it } from "vitest";
import { largestDifference, seededTensor } from "../testing/seeded-tensor";
import kernelsUrl from "./object-kernels.wasm?url&inline";
import { add, mul, sigmoid, type Tensor } from "./tensor-ops";
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
