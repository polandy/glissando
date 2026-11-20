//! The YOLOX-nano operators of `src/focus/onnx/tensor-ops.ts` as WebAssembly kernels (ADR-0060).
//! Tensors are float32 in this module's linear memory; the TypeScript glue allocates them from
//! the arena, passes their addresses and reads the results back.
#![cfg_attr(target_arch = "wasm32", no_std)]

mod arena;
mod elementwise;

#[cfg(target_arch = "wasm32")]
#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}

/// # Safety
/// `a`, `b` and `out` hold `len` floats each; `out` overlaps neither input.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn add(a: *const f32, b: *const f32, out: *mut f32, len: usize) {
    let (a, b, out) = unsafe { binary(a, b, out, len) };
    elementwise::add(a, b, out);
}

/// # Safety
/// As [`add`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn mul(a: *const f32, b: *const f32, out: *mut f32, len: usize) {
    let (a, b, out) = unsafe { binary(a, b, out, len) };
    elementwise::mul(a, b, out);
}

/// # Safety
/// `input` and `out` hold `len` floats each and do not overlap.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn sigmoid(input: *const f32, out: *mut f32, len: usize) {
    let (input, out) = unsafe { unary(input, out, len) };
    elementwise::sigmoid(input, out);
}

/// # Safety
/// As [`sigmoid`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn silu(input: *const f32, out: *mut f32, len: usize) {
    let (input, out) = unsafe { unary(input, out, len) };
    elementwise::silu(input, out);
}

unsafe fn binary<'a>(
    a: *const f32,
    b: *const f32,
    out: *mut f32,
    len: usize,
) -> (&'a [f32], &'a [f32], &'a mut [f32]) {
    unsafe {
        (
            core::slice::from_raw_parts(a, len),
            core::slice::from_raw_parts(b, len),
            core::slice::from_raw_parts_mut(out, len),
        )
    }
}

unsafe fn unary<'a>(input: *const f32, out: *mut f32, len: usize) -> (&'a [f32], &'a mut [f32]) {
    unsafe {
        (
            core::slice::from_raw_parts(input, len),
            core::slice::from_raw_parts_mut(out, len),
        )
    }
}
