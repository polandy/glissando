# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Cap the Ken-Burns zoom by detected image sharpness — later (owner: not now); the pure score and its map to a max zoom exist (`src/compose/sharpness-zoom-cap.ts`); left: measure each picture's subject at its on-screen size, store the score, calibrate the floor on real-size crops and apply the cap in `autoKenBurns`, so a soft subject or image is zoomed less and its softness shows less (2026-11-13)
- [ ] ADR-0060 step 4: `wasm-runner.ts` into the worker — the SIMD probe and the injected runner choice in `focus-worker.ts` with the JS fallback, the chelsea browser test through both runners in all three engines, the Rust `core` licence in `build/committed-licenses.ts` (2026-11-20)
- [ ] ADR-0060 step 5: a script under `scripts/` that times the network per picture in host Chrome at 1× and 4× CPU throttle, its numbers into ADR-0060 (2026-11-20)
