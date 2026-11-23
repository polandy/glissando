// The operators of `tensor-ops.ts` on tensors that live in the Rust kernels' arena (ADR-0060):
// each one allocates its output there; the graph walk releases it after its last reader, and
// whoever holds the arena's mark frees the rest.
import { item } from "./item";
import type { Operators } from "./run-onnx";
import type { Tensor } from "./tensor-ops";
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
} from "./tensor-layout";
import {
  allocate,
  copyIn,
  copyInts,
  floats,
  MAX_RANK,
  type Address,
  type BinaryKernel,
  type KernelModule,
  type UnaryKernel,
} from "./wasm-module";

/** A float tensor at `address` in the module's memory. */
export interface ArenaTensor {
  readonly dims: readonly number[];
  readonly address: Address;
}

// A null pointer: the conv kernel adds no bias.
const NO_BIAS = 0;

export function arenaOperators(module: KernelModule): Operators<ArenaTensor> {
  const produce = (dims: readonly number[], kernel: (out: Address) => void): ArenaTensor => {
    const address = allocate(module, sizeOf(dims));
    kernel(address);
    return { dims, address };
  };
  const binary = (kernel: BinaryKernel) => (a: ArenaTensor, b: ArenaTensor) => {
    if (a.dims.join() !== b.dims.join()) {
      throw new RangeError(`Cannot combine shapes ${a.dims} and ${b.dims}`);
    }
    return produce(a.dims, (out) => kernel(a.address, b.address, out, sizeOf(a.dims)));
  };
  const unary = (kernel: UnaryKernel) => (input: ArenaTensor) =>
    produce(input.dims, (out) => kernel(input.address, out, sizeOf(input.dims)));
  const stridedCopy = (
    input: ArenaTensor,
    outDims: number[],
    inStrides: number[],
    base: number,
  ) => {
    if (outDims.length > MAX_RANK) throw new RangeError(`Rank ${outDims.length} is too high`);
    const dimsAt = copyInts(module, outDims);
    const stridesAt = copyInts(module, inStrides);
    const output = produce(outDims, (out) =>
      module.strided_copy(
        input.address,
        sizeOf(input.dims),
        out,
        outDims.length,
        dimsAt,
        stridesAt,
        base,
      ),
    );
    module.arena_release(stridesAt, inStrides.length);
    module.arena_release(dimsAt, outDims.length);
    return output;
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
      if (bias && sizeOf(bias.dims) !== outChannels) {
        throw new RangeError(`conv: bias ${bias.dims} does not fit ${outChannels} output channels`);
      }
      return produce([1, outChannels, outHeight, outWidth], (out) =>
        module.conv(
          input.address,
          kernel.address,
          bias?.address ?? NO_BIAS,
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
      return produce([1, channels, outHeight, outWidth], (out) =>
        module.max_pool(
          input.address,
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
      return produce(dims, (out) =>
        module.resize_nearest(input.address, out, channels, height, width, scaleY, scaleX),
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
      return produce(dims, (out) => {
        let offset = 0;
        for (const input of inputs) {
          const chunk = item(input.dims, axis) * inner;
          module.concat_into(input.address, out, outer, chunk, outRow, offset);
          offset += chunk;
        }
      });
    },
    reshape: (input, shape) =>
      produce(reshapedDims(input.dims, shape), (out) =>
        module.copy(input.address, out, sizeOf(input.dims)),
      ),
    values: (tensor) => [...floats(module, tensor.address, sizeOf(tensor.dims))],
    release: (tensor) => module.arena_release(tensor.address, sizeOf(tensor.dims)),
  };
}

/** Runs `work` and frees everything it allocated in the arena, also when it throws. */
export function hosted<T>(module: KernelModule, work: () => T): T {
  const mark = module.arena_mark();
  try {
    return work();
  } finally {
    module.arena_reset(mark);
  }
}

export function toArena(module: KernelModule, tensor: Tensor): ArenaTensor {
  if (tensor.data.length !== sizeOf(tensor.dims)) {
    throw new RangeError(
      `A tensor of ${tensor.data.length} floats cannot have shape ${tensor.dims}`,
    );
  }
  return { dims: tensor.dims, address: copyIn(module, tensor.data) };
}

/** A copy of an arena tensor that outlives the arena's next reset. */
export function readOut(module: KernelModule, tensor: ArenaTensor): Tensor {
  return { dims: tensor.dims, data: floats(module, tensor.address, sizeOf(tensor.dims)).slice() };
}
