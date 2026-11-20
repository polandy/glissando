//! The data-movement operators: Slice and Transpose as one strided gather, Concat, and the copy
//! behind Reshape. Output shapes are the glue's business; these only move floats.

/// The most axes a strided gather walks.
pub const MAX_RANK: usize = 6;

/// Fills `out` in row-major order of `out_dims`, reading the input at `base` plus the position
/// times `in_strides`. Slice reads with its window's first element and stretched strides,
/// Transpose with the permuted strides.
pub fn strided_copy(
    input: &[f32],
    out: &mut [f32],
    out_dims: &[usize],
    in_strides: &[usize],
    base: usize,
) {
    let Some((&inner, outer_dims)) = out_dims.split_last() else {
        return;
    };
    let inner_stride = in_strides[outer_dims.len()];
    let mut position = [0usize; MAX_RANK];
    for row in out.chunks_exact_mut(inner.max(1)) {
        let mut from = base;
        for (at, stride) in position.iter().zip(in_strides) {
            from += at * stride;
        }
        for (x, out) in row.iter_mut().enumerate() {
            *out = input[from + x * inner_stride];
        }
        advance(&mut position[..outer_dims.len()], outer_dims);
    }
}

// Steps a row-major index vector to the next position.
fn advance(position: &mut [usize], dims: &[usize]) {
    for (at, &dim) in position.iter_mut().zip(dims).rev() {
        *at += 1;
        if *at < dim {
            return;
        }
        *at = 0;
    }
}

/// Writes `outer` blocks of `chunk` floats from `input` into the rows of `out`, each `out_row`
/// floats wide, starting `offset` floats into the row: one input of a Concat.
pub fn concat_into(
    input: &[f32],
    out: &mut [f32],
    outer: usize,
    chunk: usize,
    out_row: usize,
    offset: usize,
) {
    for block in 0..outer {
        let to = block * out_row + offset;
        out[to..to + chunk].copy_from_slice(&input[block * chunk..(block + 1) * chunk]);
    }
}

pub fn copy(input: &[f32], out: &mut [f32]) {
    out.copy_from_slice(input);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slice_takes_every_other_row_and_column_from_an_offset_as_the_focus_layer_does() {
        let input: [f32; 16] = core::array::from_fn(|index| index as f32);
        let mut out = [0.0; 4];

        // Window [1, 0] step [2, 2] of a 4×4 plane: base 4, strides stretched to [8, 2].
        strided_copy(&input, &mut out, &[2, 2], &[8, 2], 4);

        assert_eq!(out, [4.0, 6.0, 12.0, 14.0]);
    }

    #[test]
    fn slice_of_a_window_that_ends_early_reads_only_inside_it() {
        let mut out = [0.0; 2];

        strided_copy(&[7.0, 8.0, 9.0], &mut out, &[1, 2], &[3, 1], 1);

        assert_eq!(out, [8.0, 9.0]);
    }

    #[test]
    fn transpose_permutes_the_axes() {
        let mut out = [0.0; 6];

        // [1, 2, 3] with permutation [0, 2, 1]: the strides [6, 1, 3] in output order.
        strided_copy(&[1.0, 2.0, 3.0, 4.0, 5.0, 6.0], &mut out, &[1, 3, 2], &[6, 1, 3], 0);

        assert_eq!(out, [1.0, 4.0, 2.0, 5.0, 3.0, 6.0]);
    }

    #[test]
    fn an_empty_output_reads_nothing() {
        strided_copy(&[], &mut [], &[0, 3], &[3, 1], 0);
    }

    #[test]
    fn concat_joins_along_the_channel_axis() {
        let mut out = [0.0; 6];

        concat_into(&[1.0, 2.0], &mut out, 1, 2, 6, 0);
        concat_into(&[3.0, 4.0, 5.0, 6.0], &mut out, 1, 4, 6, 2);

        assert_eq!(out, [1.0, 2.0, 3.0, 4.0, 5.0, 6.0]);
    }

    #[test]
    fn concat_joins_along_the_last_axis_by_interleaving_the_rows() {
        let mut out = [0.0; 6];

        concat_into(&[1.0, 2.0], &mut out, 2, 1, 3, 0);
        concat_into(&[3.0, 4.0, 5.0, 6.0], &mut out, 2, 2, 3, 1);

        assert_eq!(out, [1.0, 3.0, 4.0, 2.0, 5.0, 6.0]);
    }

    #[test]
    fn reshape_keeps_the_data() {
        let mut out = [0.0; 3];

        copy(&[1.0, 2.0, 3.0], &mut out);

        assert_eq!(out, [1.0, 2.0, 3.0]);
    }
}
