// The exports of the Rust kernels (wasm/object-kernels/, ADR-0060) and the copies in and out of
// the module's linear memory.

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

export type Address = number;
export type BinaryKernel = (a: Address, b: Address, out: Address, length: number) => void;
export type UnaryKernel = (input: Address, out: Address, length: number) => void;

export interface KernelModule {
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

export async function instantiateKernels(bytes: BufferSource): Promise<KernelModule> {
  const { instance } = await WebAssembly.instantiate(bytes);
  const { exports } = instance;
  if (!(exports["memory"] instanceof WebAssembly.Memory)) {
    throw new Error("The object kernels export no memory");
  }
  const missing = KERNEL_EXPORTS.filter((name) => typeof exports[name] !== "function");
  if (missing.length > 0) throw new Error(`The object kernels lack ${missing.join(", ")}`);
  return exports as unknown as KernelModule;
}

export function allocate(module: KernelModule, count: number): Address {
  const address = module.arena_alloc(count);
  if (address === 0) throw new RangeError(`The object kernels cannot hold ${count} more floats`);
  return address;
}

export function copyIn(module: KernelModule, data: Float32Array): Address {
  const address = allocate(module, data.length);
  floats(module, address, data.length).set(data);
  return address;
}

export function copyInts(module: KernelModule, values: readonly number[]): Address {
  const address = allocate(module, values.length);
  new Uint32Array(module.memory.buffer, address, values.length).set(values);
  return address;
}

// A fresh view each time: growing the memory detaches every earlier one.
export function floats(module: KernelModule, address: Address, length: number): Float32Array {
  return new Float32Array(module.memory.buffer, address, length);
}
