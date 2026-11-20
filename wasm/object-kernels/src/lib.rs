//! The YOLOX-nano operators of `src/focus/onnx/tensor-ops.ts` as WebAssembly kernels (ADR-0060).
//! Tensors are float32 in this module's linear memory; the TypeScript glue allocates them from
//! the arena, passes their addresses and reads the results back.
#![cfg_attr(target_arch = "wasm32", no_std)]

mod arena;
mod conv;
mod elementwise;
mod movement;
mod pooling;

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

/// Slice and Transpose: see [`movement::strided_copy`]. `out_dims` and `in_strides` point at
/// `rank` (at most [`movement::MAX_RANK`]) 32-bit counts each; `input` holds `in_len` floats and
/// every position the strides reach, `out` the product of `out_dims`; the two do not overlap.
///
/// # Safety
/// As described above.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn strided_copy(
    input: *const f32,
    in_len: usize,
    out: *mut f32,
    rank: usize,
    out_dims: *const usize,
    in_strides: *const usize,
    base: usize,
) {
    unsafe {
        let out_dims = core::slice::from_raw_parts(out_dims, rank);
        let out_len = out_dims.iter().product();
        movement::strided_copy(
            core::slice::from_raw_parts(input, in_len),
            core::slice::from_raw_parts_mut(out, out_len),
            out_dims,
            core::slice::from_raw_parts(in_strides, rank),
            base,
        );
    }
}

/// One input of a Concat, see [`movement::concat_into`].
///
/// # Safety
/// `input` holds `outer * chunk` floats, `out` holds `outer * out_row`; they do not overlap.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn concat_into(
    input: *const f32,
    out: *mut f32,
    outer: usize,
    chunk: usize,
    out_row: usize,
    offset: usize,
) {
    unsafe {
        movement::concat_into(
            core::slice::from_raw_parts(input, outer * chunk),
            core::slice::from_raw_parts_mut(out, outer * out_row),
            outer,
            chunk,
            out_row,
            offset,
        );
    }
}

/// Reshape: the data, unchanged.
///
/// # Safety
/// As [`sigmoid`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn copy(input: *const f32, out: *mut f32, len: usize) {
    let (input, out) = unsafe { unary(input, out, len) };
    movement::copy(input, out);
}

/// Conv, see [`conv::conv`]; `bias` is null or holds `out_channels` floats. `in_channels`
/// divides by `group` into the kernel's input channels per group.
///
/// # Safety
/// `input` holds `in_channels * height * width` floats, `kernel` holds `out_channels *
/// in_channels / group * kernel_y * kernel_x`, `out` holds `out_channels * out_height *
/// out_width`; `out` overlaps none of the others.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn conv(
    input: *const f32,
    kernel: *const f32,
    bias: *const f32,
    out: *mut f32,
    in_channels: usize,
    height: usize,
    width: usize,
    out_channels: usize,
    group: usize,
    kernel_y: usize,
    kernel_x: usize,
    stride_y: usize,
    stride_x: usize,
    pad_top: usize,
    pad_left: usize,
    out_height: usize,
    out_width: usize,
) {
    let kernel_len = out_channels * in_channels / group * kernel_y * kernel_x;
    unsafe {
        conv::conv(
            core::slice::from_raw_parts(input, in_channels * height * width),
            core::slice::from_raw_parts(kernel, kernel_len),
            (!bias.is_null()).then(|| core::slice::from_raw_parts(bias, out_channels)),
            core::slice::from_raw_parts_mut(out, out_channels * out_height * out_width),
            &conv::Shape {
                in_channels,
                height,
                width,
                out_channels,
                kernel: (kernel_y, kernel_x),
                out: (out_height, out_width),
            },
            &conv::Window {
                group,
                stride: (stride_y, stride_x),
                pad: (pad_top, pad_left),
            },
        );
    }
}

/// # Safety
/// `input` holds `channels * height * width` floats, `out` holds `channels * out_height *
/// out_width`; they do not overlap. The kernel, stride and top and left padding are per axis.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn max_pool(
    input: *const f32,
    out: *mut f32,
    channels: usize,
    height: usize,
    width: usize,
    out_height: usize,
    out_width: usize,
    kernel_y: usize,
    kernel_x: usize,
    stride_y: usize,
    stride_x: usize,
    pad_top: usize,
    pad_left: usize,
) {
    unsafe {
        pooling::max_pool(
            core::slice::from_raw_parts(input, channels * height * width),
            core::slice::from_raw_parts_mut(out, channels * out_height * out_width),
            channels,
            (height, width),
            (out_height, out_width),
            &pooling::Window {
                kernel: (kernel_y, kernel_x),
                stride: (stride_y, stride_x),
                pad: (pad_top, pad_left),
            },
        );
    }
}

/// # Safety
/// As [`max_pool`], with `scale_y` and `scale_x` the integer factors.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn resize_nearest(
    input: *const f32,
    out: *mut f32,
    channels: usize,
    height: usize,
    width: usize,
    scale_y: usize,
    scale_x: usize,
) {
    let (out_height, out_width) = (height * scale_y, width * scale_x);
    unsafe {
        pooling::resize_nearest(
            core::slice::from_raw_parts(input, channels * height * width),
            core::slice::from_raw_parts_mut(out, channels * out_height * out_width),
            channels,
            (height, width),
            (out_height, out_width),
            (scale_y, scale_x),
        );
    }
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
