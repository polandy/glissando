// The smallest module with a SIMD instruction: a function returning `i8x16.popcnt(i8x16.splat(0))`.
const SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15,
  253, 98, 11,
]);

/** Whether the engine runs WebAssembly SIMD, which the Rust object kernels are built with. */
export function supportsWasmSimd(
  validate: (bytes: BufferSource) => boolean = (bytes) => WebAssembly.validate(bytes),
): boolean {
  return validate(SIMD_PROBE);
}
