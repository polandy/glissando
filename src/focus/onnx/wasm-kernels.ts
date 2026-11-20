// The Rust kernels of ADR-0060 (wasm/object-kernels/) behind the operators of `tensor-ops.ts`.
// Each call copies its tensors into the module's arena and frees them before it returns.
import { item } from "./item";
import {
  concatDims,
  convGeometry,
  pooledDims,
  reshapedDims,
  resizedDims,
  sizeOf,
  sliceWindow,
  stridesOf,
  transposedDims,
  transposedStrides,
  type ConvAttributes,
  type PoolAttributes,
  type SliceAttributes,
} from "./tensor-layout";
import type { Tensor } from "./tensor-ops";

// The most axes the strided gather walks, as `MAX_RANK` in movement.rs.
const MAX_RANK = 6;
// A null pointer: the conv kernel adds no bias.
const NO_BIAS = 0;

const KERNEL_EXPORTS = [
  "arena_alloc",
  "arena_mark",
  "arena_reset",
  "add",
  "mul",
  "sigmoid",
  "silu",
  "strided_copy",
  "concat_into",
  "copy",
  "conv",
  "max_pool",
  "resize_nearest",
] as const;

type Address = number;
type BinaryKernel = (a: Address, b: Address, out: Address, length: number) => void;
type UnaryKernel = (input: Address, out: Address, length: number) => void;

interface KernelModule {
  readonly memory: WebAssembly.Memory;
  readonly arena_alloc: (count: number) => Address;
  readonly arena_mark: () => Address;
  readonly arena_reset: (mark: Address) => void;
  readonly add: BinaryKernel;
  readonly mul: BinaryKernel;
  readonly sigmoid: UnaryKernel;
  readonly silu: UnaryKernel;
  readonly strided_copy: (
    input: Address,
    inLength: number,
    out: Address,
    rank: number,
    outDims: Address,
    inStrides: Address,
    base: number,
  ) => void;
  readonly concat_into: (
    input: Address,
    out: Address,
    outer: number,
    chunk: number,
    outRow: number,
    offset: number,
  ) => void;
  readonly copy: UnaryKernel;
  readonly conv: (
    input: Address,
    kernel: Address,
    bias: Address,
    out: Address,
    ...sizes: number[]
  ) => void;
  readonly max_pool: (input: Address, out: Address, ...sizes: number[]) => void;
  readonly resize_nearest: (input: Address, out: Address, ...sizes: number[]) => void;
}

export interface WasmKernels {
  add(a: Tensor, b: Tensor): Tensor;
  mul(a: Tensor, b: Tensor): Tensor;
  sigmoid(input: Tensor): Tensor;
  maxPool(input: Tensor, attributes: PoolAttributes): Tensor;
  /** Nearest-neighbour resize by integer scales. */
  resizeNearest(input: Tensor, scales: readonly number[]): Tensor;
  slice(input: Tensor, attributes: SliceAttributes): Tensor;
  concat(inputs: readonly Tensor[], axis: number): Tensor;
  reshape(input: Tensor, shape: readonly number[]): Tensor;
  transpose(input: Tensor, permutation: readonly number[]): Tensor;
  /** `x * sigmoid(x)` in one pass: the network's Mul after Sigmoid. */
  silu(input: Tensor): Tensor;
  conv(input: Tensor, kernel: Tensor, bias: Tensor | undefined, attributes: ConvAttributes): Tensor;
  /** How far the arena reaches into the module's memory, in bytes. */
  bytesInUse(): number;
}

export async function loadWasmKernels(bytes: BufferSource): Promise<WasmKernels> {
  const { instance } = await WebAssembly.instantiate(bytes);
  const module = kernelModule(instance.exports);
  type Frame = {
    readonly addresses: Address[];
    readonly out: Address;
    ints(values: number[]): Address;
  };
  const run = (
    inputs: readonly Tensor[],
    dims: readonly number[],
    kernel: (frame: Frame) => void,
  ): Tensor => {
    const mark = module.arena_mark();
    try {
      const addresses = inputs.map((input) => copyIn(module, input.data));
      const length = sizeOf(dims);
      const out = allocate(module, length);
      kernel({ addresses, out, ints: (values) => copyInts(module, values) });
      return { dims, data: floats(module, out, length).slice() };
    } finally {
      module.arena_reset(mark);
    }
  };
  const binary = (kernel: BinaryKernel) => (a: Tensor, b: Tensor) => {
    requireSameShape(a, b);
    return run([a, b], a.dims, ({ addresses, out }) =>
      kernel(item(addresses, 0), item(addresses, 1), out, a.data.length),
    );
  };
  const unary = (kernel: UnaryKernel) => (input: Tensor) =>
    run([input], input.dims, ({ addresses, out }) =>
      kernel(item(addresses, 0), out, input.data.length),
    );
  const stridedCopy = (input: Tensor, outDims: number[], inStrides: number[], base: number) => {
    if (outDims.length > MAX_RANK) throw new RangeError(`Rank ${outDims.length} is too high`);
    return run([input], outDims, ({ addresses, out, ints }) =>
      module.strided_copy(
        item(addresses, 0),
        input.data.length,
        out,
        outDims.length,
        ints(outDims),
        ints(inStrides),
        base,
      ),
    );
  };
  return {
    add: binary(module.add),
    mul: binary(module.mul),
    sigmoid: unary(module.sigmoid),
    silu: unary(module.silu),
    conv(input, kernel, bias, attributes) {
      const { group, strides, pads } = attributes;
      const geometry = convGeometry(input.dims, kernel.dims, attributes);
      const { outChannels, outHeight, outWidth } = geometry;
      const inputs = bias ? [input, kernel, bias] : [input, kernel];
      return run(inputs, [1, outChannels, outHeight, outWidth], ({ addresses, out }) =>
        module.conv(
          item(addresses, 0),
          item(addresses, 1),
          addresses[2] ?? NO_BIAS,
          out,
          geometry.inChannels,
          geometry.height,
          geometry.width,
          outChannels,
          group,
          geometry.kernelHeight,
          geometry.kernelWidth,
          ...strides,
          pads[0],
          pads[1],
          outHeight,
          outWidth,
        ),
      );
    },
    maxPool(input, attributes) {
      const { kernel, strides, pads } = attributes;
      const [, channels, outHeight, outWidth] = pooledDims(input.dims, attributes);
      const [, , height, width] = input.dims as [number, number, number, number];
      return run([input], [1, channels, outHeight, outWidth], ({ addresses, out }) =>
        module.max_pool(
          item(addresses, 0),
          out,
          channels,
          height,
          width,
          outHeight,
          outWidth,
          ...kernel,
          ...strides,
          pads[0],
          pads[1],
        ),
      );
    },
    resizeNearest(input, scales) {
      const dims = resizedDims(input.dims, scales);
      const [, , scaleY, scaleX] = scales as [number, number, number, number];
      if (!Number.isInteger(scaleY) || !Number.isInteger(scaleX)) {
        throw new RangeError(`resizeNearest: scales ${scales} are not integers`);
      }
      const [, channels, height, width] = input.dims as [number, number, number, number];
      return run([input], dims, ({ addresses, out }) =>
        module.resize_nearest(item(addresses, 0), out, channels, height, width, scaleY, scaleX),
      );
    },
    slice(input, attributes) {
      const { first, step, outDims } = sliceWindow(input.dims, attributes);
      const inStrides = stridesOf(input.dims);
      const base = first.reduce((total, at, axis) => total + at * item(inStrides, axis), 0);
      return stridedCopy(
        input,
        outDims,
        inStrides.map((stride, axis) => stride * item(step, axis)),
        base,
      );
    },
    transpose: (input, permutation) =>
      stridedCopy(
        input,
        transposedDims(input.dims, permutation),
        transposedStrides(input.dims, permutation),
        0,
      ),
    concat(inputs, axis) {
      const dims = concatDims(
        inputs.map((input) => input.dims),
        axis,
      );
      const outer = sizeOf(dims.slice(0, axis));
      const inner = sizeOf(dims.slice(axis + 1));
      const outRow = item(dims, axis) * inner;
      return run(inputs, dims, ({ addresses, out }) => {
        let offset = 0;
        inputs.forEach((input, index) => {
          const chunk = item(input.dims, axis) * inner;
          module.concat_into(item(addresses, index), out, outer, chunk, outRow, offset);
          offset += chunk;
        });
      });
    },
    reshape: (input, shape) =>
      run([input], reshapedDims(input.dims, shape), ({ addresses, out }) =>
        module.copy(item(addresses, 0), out, input.data.length),
      ),
    bytesInUse: () => module.arena_mark(),
  };
}

function kernelModule(exports: WebAssembly.Exports): KernelModule {
  if (!(exports["memory"] instanceof WebAssembly.Memory)) {
    throw new Error("The object kernels export no memory");
  }
  const missing = KERNEL_EXPORTS.filter((name) => typeof exports[name] !== "function");
  if (missing.length > 0) throw new Error(`The object kernels lack ${missing.join(", ")}`);
  return exports as unknown as KernelModule;
}

function requireSameShape(a: Tensor, b: Tensor): void {
  if (a.data.length !== b.data.length || a.dims.join() !== b.dims.join()) {
    throw new RangeError(`Cannot combine shapes ${a.dims} and ${b.dims}`);
  }
}

function allocate(module: KernelModule, count: number): Address {
  const address = module.arena_alloc(count);
  if (address === 0) throw new RangeError(`The object kernels cannot hold ${count} more floats`);
  return address;
}

function copyIn(module: KernelModule, data: Float32Array): Address {
  const address = allocate(module, data.length);
  floats(module, address, data.length).set(data);
  return address;
}

function copyInts(module: KernelModule, values: readonly number[]): Address {
  const address = allocate(module, values.length);
  new Uint32Array(module.memory.buffer, address, values.length).set(values);
  return address;
}

// A fresh view each time: growing the memory detaches every earlier one.
function floats(module: KernelModule, address: Address, length: number): Float32Array {
  return new Float32Array(module.memory.buffer, address, length);
}
