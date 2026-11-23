// The Rust kernels of ADR-0060 behind the operators of `tensor-ops.ts`, one call at a time:
// each call copies its tensors into the module's arena and frees them before it returns.
import type { Operators } from "../run-onnx";
import type { Tensor } from "../tensor-ops";
import { instantiateKernels } from "../wasm-module";
import { arenaOperators, hosted, readOut, toArena, type ArenaTensor } from "../wasm-operators";

export type WasmKernels = Omit<Operators<Tensor>, "values" | "release"> & {
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
