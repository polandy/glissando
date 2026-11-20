// The Rust kernels of ADR-0060 behind the operators of `tensor-ops.ts`, one call at a time:
// each call copies its tensors into the module's arena and frees them before it returns.
import type { Operators } from "./run-onnx";
import type { Tensor } from "./tensor-ops";
import { sizeOf } from "./tensor-layout";
import { arenaOperators, type ArenaTensor } from "./wasm-operators";
import { copyIn, floats, instantiateKernels, type KernelModule } from "./wasm-module";

export type WasmKernels = Omit<Operators<Tensor>, "values"> & {
  /** How far the arena reaches into the module's memory, in bytes. */
  bytesInUse(): number;
};

export async function loadWasmKernels(bytes: BufferSource): Promise<WasmKernels> {
  const module = await instantiateKernels(bytes);
  const operators = arenaOperators(module);
  const call =
    <Rest extends unknown[]>(operator: (input: ArenaTensor, ...rest: Rest) => ArenaTensor) =>
    (input: Tensor, ...rest: Rest): Tensor =>
      hosted(module, () => readOut(module, operator(toArena(module, input), ...rest)));
  const binary =
    (operator: (a: ArenaTensor, b: ArenaTensor) => ArenaTensor) => (a: Tensor, b: Tensor) =>
      hosted(module, () => readOut(module, operator(toArena(module, a), toArena(module, b))));
  return {
    add: binary(operators.add),
    mul: binary(operators.mul),
    sigmoid: call(operators.sigmoid),
    silu: call(operators.silu),
    maxPool: call(operators.maxPool),
    resizeNearest: call(operators.resizeNearest),
    slice: call(operators.slice),
    reshape: call(operators.reshape),
    transpose: call(operators.transpose),
    conv: (input, kernel, bias, attributes) =>
      hosted(module, () => {
        const [arenaInput, arenaKernel] = [toArena(module, input), toArena(module, kernel)];
        const arenaBias = bias && toArena(module, bias);
        return readOut(module, operators.conv(arenaInput, arenaKernel, arenaBias, attributes));
      }),
    concat: (inputs, axis) =>
      hosted(module, () =>
        readOut(
          module,
          operators.concat(
            inputs.map((input) => toArena(module, input)),
            axis,
          ),
        ),
      ),
    bytesInUse: () => module.arena_mark(),
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
