# ADR-0060: The object network's kernels run as a small own Rust module compiled to WebAssembly

**Status:** proposed

## Context

ADR-0036 runs YOLOX-nano with ~600 lines of own TypeScript. Its cost is time: measured on
2026-11-20 (origin/main `b6d06279`, Ryzen 7 7800X3D, Chrome 156, generated pictures only), one
picture without a face takes **1.40 s** on the desktop and about 5–6 s on a phone (4× CPU
throttle). A 20-picture focus pass took 26.4–27.0 s; 300 pictures without faces take about
**28 min** on a phone. No other measured path is CPU-bound in JS: playback leaves the main
thread 78–94% idle, the 1080p video export is GPU- and encoder-bound at 6.5× realtime, and the
app renders first at 0.55 s cold on a phone. The CRC-32 hot path was fixed in JS (#402).

Where the 1.40 s go, per operator: 1×1 Conv 38%, Slice (the Focus stem) 21%, Mul 14% and
Sigmoid 10% (together SiLU), 3×3 Conv 6%, MaxPool 5%, the rest 6%. The same network on
onnxruntime-web 1.22.0 (WASM SIMD, one thread) takes **55 ms**. An own Rust kernel with the
same tap-wise 3×3 conv algorithm as the JS one ran **7.7×** faster with `simd128` (3.3× without),
its result within 1.4e-6 of the JS one.

`objectFocus` takes the network as an `ObjectNetwork`, `(input: Tensor) => Tensor`, which
`focus-worker.ts` builds from `runOnnx`. ADR-0036 names this seam as the place a faster runner
plugs in without touching anything else.

## Options weighed

1. **Keep the JS interpreter as it is.** No work; imports of hundreds of pictures on a phone
   keep taking half an hour.
2. **Speed up the JS interpreter** (a fused SiLU, a direct Slice, the 1×1 conv as a blocked
   GEMM). Estimated, not measured: 1.4 s → 0.4–0.6 s, 2–4 days, no new toolchain. Still 4–10×
   behind WASM SIMD.
3. **onnxruntime-web behind the seam.** The fastest (55 ms, 24 ms with 4 threads), but rejected
   in ADR-0036 for its size: an 11 MB `.wasm`, 2.9 MB gzip, plus its JS. Threads need
   `crossOriginIsolated` (COOP/COEP), which would break the HTML export and Immich images.
4. **An own Rust module with the kernels of the ten operators, compiled to WASM with SIMD**
   (chosen). About the speed of option 3 at about 1% of its size; the cost is a second
   toolchain and a second implementation of each operator.
5. **The whole runner in Rust**, ONNX parsing and graph walk included. Moves 200 more lines
   that are not hot into Rust and needs a richer boundary (strings, a graph) for no speed gain.
6. **A full rewrite of Glissando in Rust/WASM.** About 107 k lines, 6–12+ person-months, a
   1–3 MB `.wasm` for the UI, and the measured paths outside this network would not get faster.

## Decision

Option 4.

- **Only the kernels move.** The ONNX reader (`onnx-model.ts`) and the graph walk
  (`run-onnx.ts`) stay in TypeScript; each of the ten operators (Conv incl. 1×1 and depthwise,
  MaxPool, Resize, Slice, Concat, Reshape, Transpose, Add, Mul, Sigmoid) gets a Rust kernel,
  the 1×1 Conv as a blocked GEMM, Mul after Sigmoid fused into one SiLU pass. An unknown
  operator still fails loud.
- **A `no_std` crate with no dependencies** (`wasm/object-kernels/`, `Cargo.lock` committed),
  target `wasm32-unknown-unknown` with `+simd128`, plain `extern "C"` exports and no
  wasm-bindgen. Tensors live in the module's linear memory: the weights are copied in once when
  the worker loads the network, activations come from a bump allocator reset at the start of
  each run. The TypeScript glue is one small file next to `run-onnx.ts`.
- **Size budget: 50–150 KB** of raw `.wasm`. A unit test fails above 150 KB.
- **Built like ADR-0020's libav.js.** `scripts/build-object-kernels.sh` builds it in the official
  `rust` image pinned by `@sha256:` with a pinned toolchain (`rust-toolchain.toml`) and
  `cargo build --locked --offline --release`. The `.wasm` is committed under `src/focus/`, pinned
  by sha256 in a unit test. A CI job rebuilds it in the same image and fails unless the hash
  matches the committed file, so the committed binary is provably the source's.
- **The JS interpreter stays as the fallback and the reference.** The worker picks the WASM
  runner only when a SIMD probe module passes `WebAssembly.validate` and the module
  instantiates; otherwise, and on any error while instantiating, it builds today's `runOnnx`
  network. The choice is made once per worker and is visible to tests. WASM SIMD is in every
  target engine (Chrome 91, Firefox 89, Safari 16.4), so the fallback is for old Safari and a
  locked-down page.
- **`FOCUS_DETECTOR_VERSION` is not raised.** Network, thresholds and preprocessing are
  unchanged and both runners must agree within tolerance (below); a stored result differs from
  a new one at most in float rounding, so re-running every library's pass would buy nothing.

## Test strategy

- **Per kernel, in Rust**: `cargo test` on the host, the cases of `tensor-ops.test.ts`
  (hand-computed small tensors, edge padding, strides, odd sizes) ported one to one.
- **Per kernel, WASM against JS**: a vitest unit test loads the committed `.wasm` (Node runs WASM
  SIMD) and runs each operator on tensors from a fixed-seed generator through both runners;
  the largest absolute difference must stay below 1e-4. Broken on purpose (one flipped kernel
  index), the case goes red.
- **Whole network**: the focus worker's browser test (scikit-image's CC0 `chelsea`, ADR-0036)
  runs the cat through both runners in all three engines and expects the same box within one
  pixel of the 416 px input.
- **Fallback**: a seam on the runner choice (the probe result and the instantiate step are
  injected) shows the JS runner is picked when the probe fails or instantiating throws, by the
  reported choice, not by the absence of an error.
- **The binary**: the sha256 pin and the 150 KB budget in a unit test; the rebuild-and-compare
  job in CI.
- **Speed is measured, not gated**: a timing test would race on a loaded runner. A script under
  `scripts/` times the network per picture in the host Chrome on the real GPU, at 1× and 4×, and
  the numbers go into this ADR when it is accepted.

## Consequences

- Expected 55–180 ms per picture on the desktop (lower end: onnxruntime-web's measurement;
  upper end: the 7.7× same-algorithm factor), so about 0.2–0.7 s on a phone instead of 5–6 s,
  and 1–4 min instead of about 28 min for 300 pictures without faces.
- The offline cache grows by at most 150 KB; the model file is unchanged.
- A second toolchain: Rust joins CI as one pinned image and one job. Upgrading it is a reviewed
  bump of the image digest and the toolchain file with a rebuilt, re-hashed `.wasm`.
- Two implementations of each operator to keep in step; the JS one is the reference the WASM one
  is tested against, and a new operator (ADR-0036) needs a kernel in both.
- The work is estimated at 1–2 weeks: the crate and its tests, the glue, the build script, the
  CI job and the measurement script.
- Option 2 stays open on its own: it would also speed up the fallback.
