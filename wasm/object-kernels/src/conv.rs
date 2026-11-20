//! Conv on one NCHW image: tap-wise for any kernel (the 3×3 and the depthwise ones), and the 1×1
//! at stride 1 without padding as a blocked GEMM. Plain loops over contiguous rows, which LLVM
//! vectorises with `simd128`.

/// The sizes a convolution works on, as `convGeometry` in `tensor-layout.ts` computes them.
pub struct Shape {
    pub in_channels: usize,
    pub height: usize,
    pub width: usize,
    pub out_channels: usize,
    pub kernel: (usize, usize),
    pub out: (usize, usize),
}

/// The group count, the stride and the top and left padding, per axis.
pub struct Window {
    pub group: usize,
    pub stride: (usize, usize),
    pub pad: (usize, usize),
}

// The GEMM's block: output channels sharing each loaded input value, and pixels per tile.
const BLOCK_ROWS: usize = 4;
const BLOCK_COLUMNS: usize = 256;

/// Each output plane is its channel's bias, or zero, plus the kernel over the input padded with
/// zeros.
pub fn conv(
    input: &[f32],
    kernel: &[f32],
    bias: Option<&[f32]>,
    out: &mut [f32],
    shape: &Shape,
    window: &Window,
) {
    let out_plane = shape.out.0 * shape.out.1;
    for (channel, plane) in out.chunks_exact_mut(out_plane).enumerate() {
        plane.fill(bias.map_or(0.0, |bias| bias[channel]));
    }
    if shape.kernel == (1, 1) && window.stride == (1, 1) && window.pad == (0, 0) {
        pointwise(input, kernel, out, shape, window.group);
    } else {
        tap_wise(input, kernel, out, shape, window);
    }
}

fn tap_wise(input: &[f32], kernel: &[f32], out: &mut [f32], shape: &Shape, window: &Window) {
    let in_per_group = shape.in_channels / window.group;
    let out_per_group = shape.out_channels / window.group;
    let (kernel_height, kernel_width) = shape.kernel;
    let in_plane = shape.height * shape.width;
    let out_plane = shape.out.0 * shape.out.1;
    for (out_channel, plane) in out.chunks_exact_mut(out_plane).enumerate() {
        let first_in = out_channel / out_per_group * in_per_group;
        for local in 0..in_per_group {
            let source = &input[(first_in + local) * in_plane..][..in_plane];
            let taps_per_plane = kernel_height * kernel_width;
            let first_tap = (out_channel * in_per_group + local) * taps_per_plane;
            let taps = &kernel[first_tap..][..taps_per_plane];
            for (tap, &weight) in taps.iter().enumerate() {
                if weight != 0.0 {
                    let at = (tap / kernel_width, tap % kernel_width);
                    accumulate(plane, source, weight, at, shape, window);
                }
            }
        }
    }
}

// Adds one kernel tap's contribution to a whole output plane, skipping what falls in the padding.
fn accumulate(
    plane: &mut [f32],
    source: &[f32],
    weight: f32,
    (ky, kx): (usize, usize),
    shape: &Shape,
    window: &Window,
) {
    let (stride_y, stride_x) = window.stride;
    let (pad_top, pad_left) = window.pad;
    let (out_height, out_width) = shape.out;
    let first_x = pad_left.saturating_sub(kx).div_ceil(stride_x);
    let end_x = (shape.width + pad_left)
        .checked_sub(kx + 1)
        .map_or(0, |last| (last / stride_x + 1).min(out_width));
    if first_x >= end_x {
        return;
    }
    let first_column = first_x * stride_x + kx - pad_left;
    for oy in 0..out_height {
        let Some(iy) = (oy * stride_y + ky).checked_sub(pad_top) else { continue };
        if iy >= shape.height {
            continue;
        }
        let row = &source[iy * shape.width + first_column..(iy + 1) * shape.width];
        let target = &mut plane[oy * out_width + first_x..oy * out_width + end_x];
        if stride_x == 1 {
            for (out, &value) in target.iter_mut().zip(row) {
                *out += weight * value;
            }
        } else {
            for (out, &value) in target.iter_mut().zip(row.iter().step_by(stride_x)) {
                *out += weight * value;
            }
        }
    }
}

// Per group, out[channel][pixel] += Σ kernel[channel][in] · input[in][pixel], in blocks of
// output channels and pixel tiles, so each input value loaded serves a whole block.
fn pointwise(input: &[f32], kernel: &[f32], out: &mut [f32], shape: &Shape, group: usize) {
    let pixels = shape.height * shape.width;
    let in_per_group = shape.in_channels / group;
    let out_per_group = shape.out_channels / group;
    let group_weights = kernel.chunks_exact(out_per_group * in_per_group);
    for ((group_out, weights), inputs) in out
        .chunks_exact_mut(out_per_group * pixels)
        .zip(group_weights)
        .zip(input.chunks_exact(in_per_group * pixels))
    {
        let blocks = group_out.chunks_mut(BLOCK_ROWS * pixels);
        for (block, block_weights) in blocks.zip(weights.chunks(BLOCK_ROWS * in_per_group)) {
            for column in (0..pixels).step_by(BLOCK_COLUMNS) {
                let span = column..pixels.min(column + BLOCK_COLUMNS);
                if block.len() == BLOCK_ROWS * pixels {
                    let (o0, rest) = block.split_at_mut(pixels);
                    let (o1, rest) = rest.split_at_mut(pixels);
                    let (o2, o3) = rest.split_at_mut(pixels);
                    let rows = [o0, o1, o2, o3].map(|row| &mut row[span.clone()]);
                    four_rows(rows, inputs, block_weights, pixels, column);
                } else {
                    let rows = block.chunks_exact_mut(pixels);
                    for (row, row_weights) in rows.zip(block_weights.chunks_exact(in_per_group)) {
                        one_row(&mut row[span.clone()], inputs, row_weights, pixels, column);
                    }
                }
            }
        }
    }
}

fn four_rows(rows: [&mut [f32]; 4], inputs: &[f32], weights: &[f32], pixels: usize, column: usize) {
    let [o0, o1, o2, o3] = rows;
    let tile = o0.len();
    let (o1, o2, o3) = (&mut o1[..tile], &mut o2[..tile], &mut o3[..tile]);
    let in_per_group = weights.len() / BLOCK_ROWS;
    for channel in 0..in_per_group {
        let x = &inputs[channel * pixels + column..][..tile];
        let w0 = weights[channel];
        let w1 = weights[in_per_group + channel];
        let w2 = weights[2 * in_per_group + channel];
        let w3 = weights[3 * in_per_group + channel];
        for i in 0..tile {
            let value = x[i];
            o0[i] += w0 * value;
            o1[i] += w1 * value;
            o2[i] += w2 * value;
            o3[i] += w3 * value;
        }
    }
}

fn one_row(row: &mut [f32], inputs: &[f32], weights: &[f32], pixels: usize, column: usize) {
    for (channel, &weight) in weights.iter().enumerate() {
        let x = &inputs[channel * pixels + column..][..row.len()];
        for (out, &value) in row.iter_mut().zip(x) {
            *out += weight * value;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    type Size = (usize, usize);

    fn shape(dims: [usize; 4], out_channels: usize, kernel: Size, out: Size) -> Shape {
        let [_, in_channels, height, width] = dims;
        Shape { in_channels, height, width, out_channels, kernel, out }
    }

    const PLAIN: Window = Window { group: 1, stride: (1, 1), pad: (0, 0) };

    #[test]
    fn sums_the_kernel_over_each_input_position_padded_with_zeros() {
        let mut out = [0.0; 4];
        let kernel = [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];
        let window = Window { pad: (1, 1), ..PLAIN };
        let shape = shape([1, 1, 2, 2], 1, (3, 3), (2, 2));

        conv(&[1.0, 2.0, 3.0, 4.0], &kernel, None, &mut out, &shape, &window);

        assert_eq!(out, [1.0 + 4.0, 2.0, 3.0, 4.0]);
    }

    #[test]
    fn adds_the_bias_of_each_output_channel() {
        let mut out = [0.0; 2];
        let shape = shape([1, 1, 1, 1], 2, (1, 1), (1, 1));

        conv(&[2.0], &[3.0, 5.0], Some(&[10.0, 20.0]), &mut out, &shape, &PLAIN);

        assert_eq!(out, [16.0, 30.0]);
    }

    #[test]
    fn steps_by_the_stride() {
        let input: [f32; 16] = core::array::from_fn(|index| index as f32);
        let mut out = [0.0; 4];
        let window = Window { group: 1, stride: (2, 2), pad: (0, 0) };

        conv(&input, &[1.0], None, &mut out, &shape([1, 1, 4, 4], 1, (1, 1), (2, 2)), &window);

        assert_eq!(out, [0.0, 2.0, 8.0, 10.0]);
    }

    #[test]
    fn convolves_each_channel_on_its_own_when_the_group_is_the_channel_count() {
        let mut out = [0.0; 2];
        let window = Window { group: 2, ..PLAIN };
        let shape = shape([1, 2, 1, 1], 2, (1, 1), (1, 1));

        conv(&[1.0, 10.0], &[2.0, 3.0], None, &mut out, &shape, &window);

        assert_eq!(out, [2.0, 30.0]);
    }

    #[test]
    fn the_blocked_gemm_agrees_with_the_tap_wise_sum_on_partial_blocks_and_tiles() {
        // 6 output channels leave a partial row block, 17×19 pixels a partial column tile.
        let (in_channels, out_channels, pixels) = (5, 6, 17 * 19);
        let input: [f32; 5 * 17 * 19] = core::array::from_fn(|index| (index % 13) as f32 - 6.0);
        let kernel: [f32; 30] = core::array::from_fn(|index| (index % 7) as f32 - 3.0);
        let shape = shape([1, in_channels, 17, 19], out_channels, (1, 1), (17, 19));
        let (mut blocked, mut tapped) = ([0.0; 6 * 17 * 19], [0.0; 6 * 17 * 19]);

        pointwise(&input, &kernel, &mut blocked, &shape, 1);
        tap_wise(&input, &kernel, &mut tapped, &shape, &PLAIN);

        assert_eq!(blocked.len(), out_channels * pixels);
        assert_eq!(blocked, tapped);
    }
}
