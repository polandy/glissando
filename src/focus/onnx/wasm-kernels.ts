// The Rust kernels of ADR-0060 (wasm/object-kernels/) behind the operators of `tensor-ops.ts`.
// Each call copies its tensors into the module's arena and frees them before it returns.
import { item } from "./item";
import type { Tensor } from "./tensor-ops";

const KERNEL_EXPORTS = [
  "arena_alloc",
  "arena_mark",
  "arena_reset",
  "add",
  "mul",
  "sigmoid",
  "silu",
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
}

export interface WasmKernels {
  add(a: Tensor, b: Tensor): Tensor;
  mul(a: Tensor, b: Tensor): Tensor;
  sigmoid(input: Tensor): Tensor;
  /** `x * sigmoid(x)` in one pass: the network's Mul after Sigmoid. */
  silu(input: Tensor): Tensor;
  /** How far the arena reaches into the module's memory, in bytes. */
  bytesInUse(): number;
}

export async function loadWasmKernels(bytes: BufferSource): Promise<WasmKernels> {
  const { instance } = await WebAssembly.instantiate(bytes);
  const module = kernelModule(instance.exports);
  const run = (inputs: readonly Tensor[], kernel: (addresses: Address[], out: Address) => void) => {
    const mark = module.arena_mark();
    try {
      const { dims, data } = item(inputs, 0);
      const addresses = inputs.map((input) => copyIn(module, input.data));
      const out = allocate(module, data.length);
      kernel(addresses, out);
      return { dims, data: floats(module, out, data.length).slice() };
    } finally {
      module.arena_reset(mark);
    }
  };
  const binary = (kernel: BinaryKernel) => (a: Tensor, b: Tensor) => {
    requireSameShape(a, b);
    return run([a, b], (addresses, out) =>
      kernel(item(addresses, 0), item(addresses, 1), out, a.data.length),
    );
  };
  const unary = (kernel: UnaryKernel) => (input: Tensor) =>
    run([input], (addresses, out) => kernel(item(addresses, 0), out, input.data.length));
  return {
    add: binary(module.add),
    mul: binary(module.mul),
    sigmoid: unary(module.sigmoid),
    silu: unary(module.silu),
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

// A fresh view each time: growing the memory detaches every earlier one.
function floats(module: KernelModule, address: Address, length: number): Float32Array {
  return new Float32Array(module.memory.buffer, address, length);
}
