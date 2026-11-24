//! Add, Mul, Sigmoid and the fused SiLU (`x * sigmoid(x)`), on same-length slices. Plain loops
//! over zipped slices, which LLVM vectorises with `simd128`.

pub fn add(a: &[f32], b: &[f32], out: &mut [f32]) {
    for ((out, &x), &y) in out.iter_mut().zip(a).zip(b) {
        *out = x + y;
    }
}

pub fn mul(a: &[f32], b: &[f32], out: &mut [f32]) {
    for ((out, &x), &y) in out.iter_mut().zip(a).zip(b) {
        *out = x * y;
    }
}

pub fn sigmoid(input: &[f32], out: &mut [f32]) {
    for (out, &x) in out.iter_mut().zip(input) {
        *out = logistic(x);
    }
}

pub fn silu(input: &[f32], out: &mut [f32]) {
    for (out, &x) in out.iter_mut().zip(input) {
        *out = x * logistic(x);
    }
}

fn logistic(x: f32) -> f32 {
    1.0 / (1.0 + exp(-x))
}

// Cephes' expf without branches: `no_std` has no `f32::exp`. Within 2 ulp on the clamped range,
// whose ends keep 2^n a normal float.
fn exp(x: f32) -> f32 {
    const LOG2_E: f32 = core::f32::consts::LOG2_E;
    const LN2_HIGH: f32 = 0.693_359_4;
    const LN2_LOW: f32 = -2.121_944_4e-4;
    // Adding and subtracting 1.5 * 2^23 rounds to the nearest integer.
    const ROUND: f32 = 12_582_912.0;
    let x = x.clamp(-87.3, 88.3);
    let n = (x * LOG2_E + ROUND) - ROUND;
    let r = x - n * LN2_HIGH - n * LN2_LOW;
    let mut p = 1.987_569_2e-4;
    p = p * r + 1.398_199_9e-3;
    p = p * r + 8.333_452e-3;
    p = p * r + 4.166_579_6e-2;
    p = p * r + 1.666_666_5e-1;
    p = p * r + 5e-1;
    let e_r = p * r * r + r + 1.0;
    e_r * f32::from_bits(((n as i32 + 127) as u32) << 23)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_and_multiplies_same_shaped_tensors() {
        let (a, b) = ([2.0, 3.0], [4.0, 5.0]);
        let mut out = [0.0; 2];

        add(&a, &b, &mut out);
        assert_eq!(out, [6.0, 8.0]);
        mul(&a, &b, &mut out);
        assert_eq!(out, [8.0, 15.0]);
    }

    #[test]
    fn sigmoid_maps_0_to_one_half() {
        let mut out = [0.0];

        sigmoid(&[0.0], &mut out);

        assert!((out[0] - 0.5).abs() < 1e-6);
    }

    #[test]
    fn silu_is_x_times_its_sigmoid() {
        let input = [-3.0, -0.5, 0.0, 0.5, 3.0];
        let mut fused = [0.0; 5];
        let mut logistic = [0.0; 5];

        silu(&input, &mut fused);
        sigmoid(&input, &mut logistic);

        for ((&fused, &logistic), &x) in fused.iter().zip(&logistic).zip(&input) {
            assert!((fused - x * logistic).abs() < 1e-6);
        }
    }

    #[test]
    fn exp_is_within_a_few_ulp_from_tail_to_tail() {
        let mut x = -87.0_f32;
        while x < 88.0 {
            let expected = (x as f64).exp();
            let relative = ((exp(x) as f64) - expected).abs() / expected;
            assert!(relative < 3e-7, "exp({x}) is off by {relative}");
            x += 0.037;
        }
    }

    #[test]
    fn sigmoid_saturates_without_overflow_far_into_both_tails() {
        let mut out = [0.5; 2];

        sigmoid(&[-1000.0, 1000.0], &mut out);

        assert!(out[0] < 1e-30, "sigmoid(-1000) is {}", out[0]);
        assert_eq!(out[1], 1.0);
    }
}
