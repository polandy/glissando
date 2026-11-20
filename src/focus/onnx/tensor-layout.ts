import { item, read } from "./item";
// The output shapes and index maps of the operators, shared by the TypeScript
// reference (`tensor-ops.ts`) and the glue of the WASM kernels (`wasm-kernels.ts`).

export interface PoolAttributes {
  readonly kernel: readonly [number, number];
  readonly strides: readonly [number, number];
  /** ONNX order: top, left, bottom, right. */
  readonly pads: readonly [number, number, number, number];
}

export interface ConvAttributes {
  readonly group: number;
  readonly strides: readonly [number, number];
  /** ONNX order: top, left, bottom, right. */
  readonly pads: readonly [number, number, number, number];
}

/** The sizes a convolution of one NCHW image works on, its output's included. */
export interface ConvGeometry {
  readonly inChannels: number;
  readonly height: number;
  readonly width: number;
  readonly outChannels: number;
  readonly inPerGroup: number;
  readonly kernelHeight: number;
  readonly kernelWidth: number;
  readonly outHeight: number;
  readonly outWidth: number;
}

export function convGeometry(
  inputDims: readonly number[],
  kernelDims: readonly number[],
  { group, strides, pads }: ConvAttributes,
): ConvGeometry {
  const [batch, inChannels, height, width] = inputDims as [number, number, number, number];
  const [outChannels, inPerGroup, kernelHeight, kernelWidth] = kernelDims as [
    number,
    number,
    number,
    number,
  ];
  if (batch !== 1 || inPerGroup * group !== inChannels || outChannels % group !== 0) {
    throw new RangeError(
      `conv: input ${inputDims} does not fit kernel ${kernelDims}, group ${group}`,
    );
  }
  return {
    inChannels,
    height,
    width,
    outChannels,
    inPerGroup,
    kernelHeight,
    kernelWidth,
    outHeight: Math.floor((height + pads[0] + pads[2] - kernelHeight) / strides[0]) + 1,
    outWidth: Math.floor((width + pads[1] + pads[3] - kernelWidth) / strides[1]) + 1,
  };
}

export interface SliceAttributes {
  readonly starts: readonly number[];
  readonly ends: readonly number[];
  readonly axes: readonly number[];
  readonly steps: readonly number[];
}

export const sizeOf = (dims: readonly number[]): number =>
  dims.reduce((total, dim) => total * dim, 1);

export function stridesOf(dims: readonly number[]): number[] {
  const strides = dims.map(() => 1);
  for (let axis = dims.length - 2; axis >= 0; axis--) {
    strides[axis] = item(strides, axis + 1) * item(dims, axis + 1);
  }
  return strides;
}

/** Where a slice starts on each axis, how far it steps and the shape it yields. */
export function sliceWindow(
  dims: readonly number[],
  { starts, ends, axes, steps }: SliceAttributes,
): { first: number[]; step: number[]; outDims: number[] } {
  const first = dims.map(() => 0);
  const step = dims.map(() => 1);
  const outDims = [...dims];
  axes.forEach((axis, index) => {
    const size = item(dims, axis);
    const stride = item(steps, index);
    if (stride < 1) throw new RangeError(`slice: step ${stride} is not positive`);
    const start = Math.min(
      item(starts, index) < 0 ? item(starts, index) + size : item(starts, index),
      size,
    );
    const end = Math.min(
      item(ends, index) < 0 ? item(ends, index) + size : item(ends, index),
      size,
    );
    first[axis] = start;
    step[axis] = stride;
    outDims[axis] = Math.max(0, Math.ceil((end - start) / stride));
  });
  return { first, step, outDims };
}

export function concatDims(inputDims: readonly (readonly number[])[], axis: number): number[] {
  const dims = [...item(inputDims, 0)];
  dims[axis] = inputDims.reduce((total, each) => total + item(each, axis), 0);
  return dims;
}

/** `shape` with a -1 dimension filled in from the element count. */
export function reshapedDims(dims: readonly number[], shape: readonly number[]): number[] {
  const length = sizeOf(dims);
  const known = sizeOf(shape.filter((dim) => dim !== -1));
  const filled = shape.map((dim) => (dim === -1 ? length / known : dim));
  if (sizeOf(filled) !== length) throw new RangeError(`reshape: ${dims} does not fit ${shape}`);
  return filled;
}

export function transposedDims(dims: readonly number[], permutation: readonly number[]): number[] {
  return permutation.map((axis) => item(dims, axis));
}

/** The input strides that walk a transposed tensor in its own row-major order. */
export function transposedStrides(
  dims: readonly number[],
  permutation: readonly number[],
): number[] {
  const inStrides = stridesOf(dims);
  return permutation.map((axis) => read(inStrides, axis));
}

export function pooledDims(
  dims: readonly number[],
  { kernel, strides, pads }: PoolAttributes,
): [number, number, number, number] {
  const [batch, channels, height, width] = dims as [number, number, number, number];
  if (batch !== 1) throw new RangeError(`maxPool: batch ${batch} is not 1`);
  return [
    1,
    channels,
    Math.floor((height + pads[0] + pads[2] - kernel[0]) / strides[0]) + 1,
    Math.floor((width + pads[1] + pads[3] - kernel[1]) / strides[1]) + 1,
  ];
}

export function resizedDims(
  dims: readonly number[],
  scales: readonly number[],
): [number, number, number, number] {
  const [batch, channels, height, width] = dims as [number, number, number, number];
  const [, , scaleY, scaleX] = scales as [number, number, number, number];
  if (batch !== 1 || scales[0] !== 1 || scales[1] !== 1) {
    throw new RangeError(`resizeNearest: scales ${scales} on input ${dims}`);
  }
  return [1, channels, Math.floor(height * scaleY), Math.floor(width * scaleX)];
}
