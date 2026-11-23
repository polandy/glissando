# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] **NEXT** ADR-0060 review fix 4/7: Rust version from `rust-toolchain.toml`: the build script reads `channel` from it; ADR-0060 lists what a bump touches (sonnet) (2026-11-24)
- [ ] **NEXT** ADR-0060 review fix 5/7: Typed WASM signatures: `conv`/`max_pool`/`resize_nearest` take tuples instead of `...sizes: number[]`, `MAX_RANK` defined once, `wasm-kernels.ts` moves to `testing/` (sonnet) (2026-11-24)
- [ ] **NEXT** ADR-0060 review fix 6/7: `cargo clippy -D warnings` in CI (the slim image has neither clippy nor rustfmt) (sonnet) (2026-11-24)
- [ ] **NEXT** ADR-0060 review fix 7/7: ADR-0060 text fixes: Rust tests are not ported one to one; "a broken kernel turns red" is only claimed; name WebGPU as a rejected option; justify the own `expf` by `no_std`; a memory budget beside the size budget (sonnet) (2026-11-24)
