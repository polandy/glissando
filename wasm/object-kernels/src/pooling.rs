//! MaxPool and nearest-neighbour Resize on one NCHW image of `channels` planes.

/// A pooling window over a plane: kernel size, stride and the top and left padding, per axis.
pub struct Window {
    pub kernel: (usize, usize),
    pub stride: (usize, usize),
    pub pad: (usize, usize),
}

/// A plane's height and width.
pub type Size = (usize, usize);

/// The largest value under each window, ignoring the padding; a window wholly in the padding
/// yields negative infinity.
pub fn max_pool(input: &[f32], out: &mut [f32], channels: usize, from: Size, to: Size, w: &Window) {
    let (height, width) = from;
    let (out_height, out_width) = to;
    for channel in 0..channels {
        let plane = &input[channel * height * width..][..height * width];
        let out_plane = &mut out[channel * out_height * out_width..][..out_height * out_width];
        for oy in 0..out_height {
            let rows = window_range(oy, w.stride.0, w.pad.0, w.kernel.0, height);
            for ox in 0..out_width {
                let columns = window_range(ox, w.stride.1, w.pad.1, w.kernel.1, width);
                let mut best = f32::NEG_INFINITY;
                for iy in rows.clone() {
                    for &value in &plane[iy * width + columns.start..iy * width + columns.end] {
                        best = best.max(value);
                    }
                }
                out_plane[oy * out_width + ox] = best;
            }
        }
    }
}

// The input positions a window at output position `at` covers, clipped to `0..size`.
fn window_range(
    at: usize,
    stride: usize,
    pad: usize,
    kernel: usize,
    size: usize,
) -> core::ops::Range<usize> {
    let start = (at * stride).saturating_sub(pad);
    let end = (at * stride + kernel).saturating_sub(pad).min(size);
    start..end.max(start)
}

/// Repeats each value by an integer scale: ONNX `asymmetric` / `floor`.
pub fn resize_nearest(
    input: &[f32],
    out: &mut [f32],
    channels: usize,
    from: Size,
    to: Size,
    scale: (usize, usize),
) {
    let (height, width) = from;
    let (out_height, out_width) = to;
    for channel in 0..channels {
        for oy in 0..out_height {
            let row = &input[(channel * height + oy / scale.0) * width..][..width];
            let out_row = &mut out[(channel * out_height + oy) * out_width..][..out_width];
            for (ox, out) in out_row.iter_mut().enumerate() {
                *out = row[ox / scale.1];
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn max_pool_takes_the_largest_value_under_the_window_ignoring_the_padding() {
        let mut out = [0.0; 4];
        let window = Window { kernel: (3, 3), stride: (1, 1), pad: (1, 1) };

        max_pool(&[-5.0, -1.0, -3.0, -2.0], &mut out, 1, (2, 2), (2, 2), &window);

        assert_eq!(out, [-1.0, -1.0, -1.0, -1.0]);
    }

    #[test]
    fn max_pool_steps_by_the_stride_on_each_channel() {
        let mut out = [0.0; 2];
        let window = Window { kernel: (2, 2), stride: (2, 2), pad: (0, 0) };
        let input = [1.0, 5.0, 3.0, 2.0, 9.0, 0.0, 4.0, 8.0];

        max_pool(&input, &mut out, 2, (2, 2), (1, 1), &window);

        assert_eq!(out, [5.0, 9.0]);
    }

    #[test]
    fn resize_repeats_each_value_by_the_scale() {
        let mut out = [0.0; 8];

        resize_nearest(&[1.0, 2.0], &mut out, 1, (1, 2), (2, 4), (2, 2));

        assert_eq!(out, [1.0, 1.0, 2.0, 2.0, 1.0, 1.0, 2.0, 2.0]);
    }
}
