#!/usr/bin/env bash
# Builds the object network's kernels of ADR-0060 (wasm/object-kernels/) into
# src/focus/onnx/object-kernels.wasm, after clippy (-D warnings) and their Rust tests pass. With
# --check it only rebuilds and fails unless the result is byte for byte the committed file (the CI job `object-kernels`).
# A build also writes the source fingerprint that object-kernels-source.test.ts compares.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
RUST_VERSION=$(sed -n 's/^channel = "\(.*\)"$/\1/p' "$repo/wasm/object-kernels/rust-toolchain.toml")
[[ "$RUST_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "no channel in rust-toolchain.toml" >&2; exit 1; }
# The slim image of that version (multi-platform index); it carries the host target only.
RUST_IMAGE=rust@sha256:6f14b2b4b278ec0d50aa1d69541c304ce0f95e0f6268487aa9924af1c2e9aebe
WASM_STD=rust-std-$RUST_VERSION-wasm32-unknown-unknown
WASM_STD_SHA256=19b7954d650fc0d22767eceb76b8e03d07ce0d6a9f4234f33c32a17ee8d6d7b9
# The slim image has no clippy; its component joins a copy of the toolchain.
CLIPPY=clippy-$RUST_VERSION-x86_64-unknown-linux-gnu
CLIPPY_SHA256=0d18df3bff6c852ef8243727fed075ecb33dbf93b8ab8c138c2f45e3f270102a
TARGET=wasm32-unknown-unknown

committed="$repo/src/focus/onnx/object-kernels.wasm"
fingerprint_file="$repo/src/focus/onnx/object-kernels.source-sha256"
check=false
[[ "${1:-}" == --check ]] && check=true
# sha256 over "<sha256>  <path>" lines of every build input, sorted by path; the unit test mirrors it.
source_fingerprint() {
  (cd "$repo" && {
    find wasm/object-kernels -type f -not -path 'wasm/object-kernels/target/*' -not -name .gitignore
    echo scripts/build-object-kernels.sh
  } | LC_ALL=C sort | xargs sha256sum | sha256sum | cut -d' ' -f1)
}
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

curl --silent --show-error --fail --location \
  "https://static.rust-lang.org/dist/$WASM_STD.tar.xz" -o "$work/$WASM_STD.tar.xz"
echo "$WASM_STD_SHA256  $work/$WASM_STD.tar.xz" | sha256sum --check --quiet -
tar -xJf "$work/$WASM_STD.tar.xz" -C "$work"
curl --silent --show-error --fail --location \
  "https://static.rust-lang.org/dist/$CLIPPY.tar.xz" -o "$work/$CLIPPY.tar.xz"
echo "$CLIPPY_SHA256  $work/$CLIPPY.tar.xz" | sha256sum --check --quiet -
tar -xJf "$work/$CLIPPY.tar.xz" -C "$work"
mkdir -p "$work/out"

# The image's toolchain is read-only to a non-root user, so the wasm32 target joins it in a
# sysroot of links.
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e CARGO_HOME=/tmp/cargo \
  -v "$repo/wasm/object-kernels:/src:ro" -v "$work/$WASM_STD/rust-std-$TARGET:/wasm-std:ro" -v "$work/$CLIPPY/clippy-preview:/clippy:ro" \
  -v "$work/out:/out" -w /src "$RUST_IMAGE" sh -euc "
    toolchain=\$(rustc --print sysroot)
    mkdir -p /tmp/sysroot/lib/rustlib
    ln -s \"\$toolchain/lib/rustlib/x86_64-unknown-linux-gnu\" /tmp/sysroot/lib/rustlib/
    ln -s /wasm-std/lib/rustlib/$TARGET /tmp/sysroot/lib/rustlib/
    cp -r \"\$toolchain\" /tmp/clippy-toolchain
    cp /clippy/bin/* /tmp/clippy-toolchain/bin/
    PATH=/tmp/clippy-toolchain/bin:\$PATH cargo clippy --quiet --locked --offline --all-targets --target-dir /tmp/target-clippy -- -D warnings
    cargo test --quiet --locked --offline --target-dir /tmp/target
    CARGO_ENCODED_RUSTFLAGS=\$(printf '%s\037%s' --sysroot=/tmp/sysroot -Ctarget-feature=+simd128) \
      cargo build --quiet --locked --offline --release --target $TARGET --target-dir /tmp/target
    cp /tmp/target/$TARGET/release/object_kernels.wasm /out/"

if $check; then
  if ! cmp --silent "$work/out/object_kernels.wasm" "$committed"; then
    echo "src/focus/onnx/object-kernels.wasm is not what wasm/object-kernels/ builds to:" >&2
    sha256sum "$work/out/object_kernels.wasm" "$committed" >&2
    exit 1
  fi
else
  install -m 644 "$work/out/object_kernels.wasm" "$committed"
  source_fingerprint >"$fingerprint_file"
fi
sha256sum "$committed"
