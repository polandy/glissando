# ADR-0060: The object network's kernels run as a small own Rust module compiled to WebAssembly

**Status:** accepted

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
the focus worker built from `runOnnx`. ADR-0036 names this seam as the place a faster runner
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
  the 1×1 Conv at stride 1 without padding as a blocked GEMM (blocks of 4 output channels by
  256 pixels), every other Conv tap-wise like the JS one, Mul after Sigmoid fused into one SiLU
  pass. An unknown operator still fails loud.
- **A `no_std` crate with no dependencies** (`wasm/object-kernels/`, `Cargo.lock` committed),
  target `wasm32-unknown-unknown` with `+simd128`, plain `extern "C"` exports and no
  wasm-bindgen. Tensors live in the module's linear memory: the weights are copied in once when
  the worker loads the network, activations come from a bump allocator with a size-keyed free
  list: the graph walk releases each activation after its last reader, the next one of that
  size takes its block, and the arena resets at the end of each run. The graph walk of `run-onnx.ts` is generic over where a tensor lives; the glue
  next to it binds the module's exports (`wasm-module.ts`), runs each operator on tensors in
  the arena (`wasm-operators.ts`) and walks the graph with SiLU fused (`fuse-silu.ts`) in
  `wasm-runner.ts`.
- **Size budget: 50–150 KB** of raw `.wasm`. A unit test fails above 150 KB.
- **Built like ADR-0020's libav.js.** `scripts/build-object-kernels.sh` runs `cargo test`, then
  `cargo build --locked --offline --release`, in the official `rust` image pinned by `@sha256:`
  with a pinned toolchain (`rust-toolchain.toml`). The image carries only the host target, so the
  script fetches the same release's `rust-std` for `wasm32-unknown-unknown` from
  static.rust-lang.org, pinned by sha256, and links it into a sysroot (the image's toolchain is
  read-only to the non-root build user). The `.wasm` is committed as
  `src/focus/onnx/object-kernels.wasm`, pinned by sha256 in a unit test. The CI job
  `object-kernels` runs the script with `--check`, which fails unless the rebuild is byte for
  byte the committed file, so the committed binary is provably the source's.
  A build also writes `object-kernels.source-sha256`, a fingerprint of the Rust sources and the
  script; a unit test recomputes it, so `npm run verify` flags a stale `.wasm` even without Docker,
  and with Docker it runs the `--check` rebuild as well.
- **The JS interpreter stays as the fallback and the reference.** The worker picks the WASM
  runner only when a SIMD probe module passes `WebAssembly.validate` (`wasm-simd.ts`) and the
  kernels download and instantiate; otherwise, and on any error while loading them, it builds
  today's `runOnnx` network and warns with the reason on the console. The choice is made once
  per worker, in `object-runner.ts`, which reports the runner it picked; `focus-worker.ts` injects
  the probe result and the load step into it, and `serve-focus-requests.ts` is the worker body
  that takes the chosen network. WASM SIMD is in every
  target engine (Chrome 91, Firefox 89, Safari 16.4), so the fallback is for old Safari and a
  locked-down page.
- **`FOCUS_DETECTOR_VERSION` is not raised** (ADR-0041): network, thresholds and preprocessing are
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
  runs the cat through both runners in all three engines, each in a worker forced onto one
  runner (`src/focus/testing/{wasm,js}-focus-worker.ts`), and expects the same box within one
  pixel of the 416 px input; it also asserts the SIMD probe passes in each engine, so the
  production worker runs the kernels there.
- **Fallback**: a seam on the runner choice (the probe result and the instantiate step are
  injected) shows the JS runner is picked when the probe fails or instantiating throws, by the
  reported choice, not by the absence of an error.
- **The binary**: the sha256 pin and the 150 KB budget in a unit test; the rebuild-and-compare
  job in CI. Rust's `core` library is compiled into it, so its MIT licence ships in the
  third-party licences (`build/committed-licenses.ts`), its version checked against
  `rust-toolchain.toml` by a unit test.
- **Speed is measured, not gated**: a timing test would race on a loaded runner. A script under
  `scripts/object-network-timing/run.mjs` times one 416 px run per picture in the host Chrome at
  1× and 4× CPU throttle and prints the table below; its numbers are in the Consequences.

## Consequences

- Expected 55–180 ms per picture on the desktop (lower end: onnxruntime-web's measurement;
  upper end: the 7.7× same-algorithm factor), so about 0.2–0.7 s on a phone instead of 5–6 s,
  and 1–4 min instead of about 28 min for 300 pictures without faces.
- First measured in Node 26 on the desktop, not in a browser: one 416 px run takes 79 ms
  through `wasm-runner.ts` against 1.51 s through `runOnnx`, the outputs within 2.8e-5.
- Measured with that script on the desktop, Chrome 156, 30 runs of the Rust kernels and 3 of the
  TypeScript runner, milliseconds per picture:

  | runner       | CPU throttle | min  | median | p95  |
  | ------------ | ------------ | ---- | ------ | ---- |
  | Rust kernels | 1×           | 69   | 73     | 94   |
  | Rust kernels | 4×           | 300  | 315    | 375  |
  | TypeScript   | 1×           | 1276 | 1304   | 1328 |
  | TypeScript   | 4×           | 5106 | 5181   | 5293 |

  The kernels run in 73 ms against 1.3 s (18×), inside the expected 55–180 ms; at 4× they take
  0.3 s, the low end of the phone estimate.

- A run peaks at about 23 MB of module memory (4.7 MB of it weights; holding every activation
  until the run ended took 100 MB). WASM memory never shrinks, so the focus worker is terminated
  after 30 s without a request (`FOCUS_WORKER_IDLE_END_MS`) and the next picture starts a fresh
  one, paying the module's compile and the weights' copy again. A unit test fails above a 24 MB
  peak.
- The offline cache grows by at most 150 KB; the model file is unchanged.
- A second toolchain: Rust joins CI as one pinned image and one job. Upgrading it is a reviewed
  bump of the image digest and the toolchain file with a rebuilt, re-hashed `.wasm`.
- Two implementations of each operator to keep in step; the JS one is the reference the WASM one
  is tested against, and a new operator (ADR-0036) needs a kernel in both.
- The work is estimated at 1–2 weeks: the crate and its tests, the glue, the build script, the
  CI job and the measurement script.
- Option 2 stays open on its own: it would also speed up the fallback.
