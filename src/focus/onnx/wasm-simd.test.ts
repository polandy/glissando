import { describe, expect, it } from "vitest";
import { supportsWasmSimd } from "./wasm-simd";

describe("the WebAssembly SIMD probe", () => {
  it("passes in an engine with SIMD", () => {
    expect(supportsWasmSimd()).toBe(true);
  });

  it("fails when the engine rejects the probe module", () => {
    expect(supportsWasmSimd(() => false)).toBe(false);
  });
});
