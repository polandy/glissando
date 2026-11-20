import { item, read } from "./item";
import {
  concatDims,
  pooledDims,
  reshapedDims,
  resizedDims,
  sizeOf,
  sliceWindow,
  stridesOf,
  transposedDims,
  type PoolAttributes,
  type SliceAttributes,
} from "./tensor-layout";

// The few tensor operators the YOLOX-nano network needs (ADR-0036), on float32 data in NCHW
// layout. Each one fails loud on a shape or attribute it does not handle.

export type { PoolAttributes, SliceAttributes };

export interface Tensor {
  readonly dims: readonly number[];
  readonly data: Float32Array;
}

export interface ConvAttributes {
  readonly group: number;
  readonly strides: readonly [number, number];
  /** ONNX order: top, left, bottom, right. */
  readonly pads: readonly [number, number, number, number];
}

export function conv(
  input: Tensor,
  kernel: Tensor,
  bias: Tensor | undefined,
  { group, strides, pads }: ConvAttributes,
): Tensor {
  const [batch, inChannels, height, width] = input.dims as [number, number, number, number];
  const [outChannels, inPerGroup, kernelHeight, kernelWidth] = kernel.dims as [
    number,
    number,
    number,
    number,
  ];
  if (batch !== 1 || inPerGroup * group !== inChannels || outChannels % group !== 0) {
    throw new RangeError(
      `conv: input ${input.dims} does not fit kernel ${kernel.dims}, group ${group}`,
    );
  }
  const outHeight = Math.floor((height + pads[0] + pads[2] - kernelHeight) / strides[0]) + 1;
  const outWidth = Math.floor((width + pads[1] + pads[3] - kernelWidth) / strides[1]) + 1;
  const out = new Float32Array(outChannels * outHeight * outWidth);
  const outPerGroup = outChannels / group;
  for (let outChannel = 0; outChannel < outChannels; outChannel++) {
    const plane = out.subarray(
      outChannel * outHeight * outWidth,
      (outChannel + 1) * outHeight * outWidth,
    );
    if (bias) plane.fill(read(bias.data, outChannel));
    const firstIn = Math.floor(outChannel / outPerGroup) * inPerGroup;
    for (let local = 0; local < inPerGroup; local++) {
      const source = (firstIn + local) * height * width;
      for (let ky = 0; ky < kernelHeight; ky++) {
        for (let kx = 0; kx < kernelWidth; kx++) {
          const weight = read(
            kernel.data,
            ((outChannel * inPerGroup + local) * kernelHeight + ky) * kernelWidth + kx,
          );
          if (weight === 0) continue;
          accumulate(plane, input.data, source, weight, {
            ky,
            kx,
            height,
            width,
            outHeight,
            outWidth,
            strides,
            pads,
          });
        }
      }
    }
  }
  return { dims: [1, outChannels, outHeight, outWidth], data: out };
}

interface TapGeometry {
  readonly ky: number;
  readonly kx: number;
  readonly height: number;
  readonly width: number;
  readonly outHeight: number;
  readonly outWidth: number;
  readonly strides: readonly [number, number];
  readonly pads: readonly [number, number, number, number];
}

// Adds one kernel tap's contribution to a whole output plane, skipping what falls in the padding.
function accumulate(
  plane: Float32Array,
  input: Float32Array,
  source: number,
  weight: number,
  { ky, kx, height, width, outHeight, outWidth, strides, pads }: TapGeometry,
): void {
  const firstX = Math.max(0, Math.ceil((pads[1] - kx) / strides[1]));
  const lastX = Math.min(outWidth - 1, Math.floor((width - 1 + pads[1] - kx) / strides[1]));
  for (let oy = 0; oy < outHeight; oy++) {
    const iy = oy * strides[0] - pads[0] + ky;
    if (iy < 0 || iy >= height) continue;
    const row = source + iy * width - pads[1] + kx;
    const target = oy * outWidth;
    // Plain typed-array indexing: this loop runs billions of times, and the checked helpers
    // cost an order of magnitude here.
    const strideX = strides[1];
    for (let ox = firstX; ox <= lastX; ox++) {
      plane[target + ox] = (plane[target + ox] ?? 0) + weight * (input[row + ox * strideX] ?? 0);
    }
  }
}

export function maxPool(input: Tensor, attributes: PoolAttributes): Tensor {
  const { kernel, strides, pads } = attributes;
  const [, , height, width] = input.dims as [number, number, number, number];
  const [, channels, outHeight, outWidth] = pooledDims(input.dims, attributes);
  const out = new Float32Array(channels * outHeight * outWidth);
  for (let channel = 0; channel < channels; channel++) {
    for (let oy = 0; oy < outHeight; oy++) {
      for (let ox = 0; ox < outWidth; ox++) {
        let best = -Infinity;
        for (let ky = 0; ky < kernel[0]; ky++) {
          const iy = oy * strides[0] - pads[0] + ky;
          if (iy < 0 || iy >= height) continue;
          for (let kx = 0; kx < kernel[1]; kx++) {
            const ix = ox * strides[1] - pads[1] + kx;
            if (ix < 0 || ix >= width) continue;
            best = Math.max(best, read(input.data, (channel * height + iy) * width + ix));
          }
        }
        out[(channel * outHeight + oy) * outWidth + ox] = best;
      }
    }
  }
  return { dims: [1, channels, outHeight, outWidth], data: out };
}

/** Nearest-neighbour resize with integer scales, as `asymmetric` / `floor` in ONNX. */
export function resizeNearest(input: Tensor, scales: readonly number[]): Tensor {
  const [, , height, width] = input.dims as [number, number, number, number];
  const [, , scaleY, scaleX] = scales as [number, number, number, number];
  const [, channels, outHeight, outWidth] = resizedDims(input.dims, scales);
  const out = new Float32Array(channels * outHeight * outWidth);
  for (let channel = 0; channel < channels; channel++) {
    for (let oy = 0; oy < outHeight; oy++) {
      const row = (channel * height + Math.floor(oy / scaleY)) * width;
      for (let ox = 0; ox < outWidth; ox++) {
        out[(channel * outHeight + oy) * outWidth + ox] = read(
          input.data,
          row + Math.floor(ox / scaleX),
        );
      }
    }
  }
  return { dims: [1, channels, outHeight, outWidth], data: out };
}

export function slice(input: Tensor, attributes: SliceAttributes): Tensor {
  const dims = [...input.dims];
  const { first, step, outDims } = sliceWindow(dims, attributes);
  const out = new Float32Array(sizeOf(outDims));
  const inStrides = stridesOf(dims);
  const position = outDims.map(() => 0);
  for (let index = 0; index < out.length; index++) {
    let from = 0;
    position.forEach((at, axis) => {
      from += (read(first, axis) + at * read(step, axis)) * read(inStrides, axis);
    });
    out[index] = read(input.data, from);
    advance(position, outDims);
  }
  return { dims: outDims, data: out };
}

export function concat(inputs: readonly Tensor[], axis: number): Tensor {
  const dims = concatDims(
    inputs.map((input) => input.dims),
    axis,
  );
  const outer = sizeOf(dims.slice(0, axis));
  const inner = sizeOf(dims.slice(axis + 1));
  const out = new Float32Array(sizeOf(dims));
  let offset = 0;
  for (const input of inputs) {
    const chunk = item(input.dims, axis) * inner;
    for (let block = 0; block < outer; block++) {
      out.set(
        input.data.subarray(block * chunk, (block + 1) * chunk),
        block * item(dims, axis) * inner + offset,
      );
    }
    offset += chunk;
  }
  return { dims, data: out };
}

export function reshape(input: Tensor, shape: readonly number[]): Tensor {
  return { dims: reshapedDims(input.dims, shape), data: input.data };
}

export function transpose(input: Tensor, permutation: readonly number[]): Tensor {
  const dims = transposedDims(input.dims, permutation);
  const inStrides = stridesOf(input.dims);
  const out = new Float32Array(input.data.length);
  const position = dims.map(() => 0);
  for (let index = 0; index < out.length; index++) {
    let from = 0;
    position.forEach((at, axis) => {
      from += at * read(inStrides, read(permutation, axis));
    });
    out[index] = read(input.data, from);
    advance(position, dims);
  }
  return { dims, data: out };
}

export const add = (a: Tensor, b: Tensor): Tensor => elementwise(a, b, (x, y) => x + y);
export const mul = (a: Tensor, b: Tensor): Tensor => elementwise(a, b, (x, y) => x * y);

export function sigmoid(input: Tensor): Tensor {
  return { dims: input.dims, data: input.data.map((value) => 1 / (1 + Math.exp(-value))) };
}

function elementwise(a: Tensor, b: Tensor, combine: (x: number, y: number) => number): Tensor {
  if (a.data.length !== b.data.length || a.dims.join() !== b.dims.join()) {
    throw new RangeError(`Cannot combine shapes ${a.dims} and ${b.dims}`);
  }
  return { dims: a.dims, data: a.data.map((value, index) => combine(value, read(b.data, index))) };
}

// Steps a row-major index vector to the next position.
function advance(position: number[], dims: readonly number[]): void {
  for (let axis = dims.length - 1; axis >= 0; axis--) {
    const next = read(position, axis) + 1;
    if (next < read(dims, axis)) {
      position[axis] = next;
      return;
    }
    position[axis] = 0;
  }
}
