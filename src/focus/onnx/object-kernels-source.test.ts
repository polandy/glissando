import { expect, it } from "vitest";
import buildScript from "../../../scripts/build-object-kernels.sh?raw";
import fingerprintFile from "./object-kernels.source-sha256?raw";

const BUILD_SCRIPT_PATH = "scripts/build-object-kernels.sh";
const kernelSources = import.meta.glob(
  "/wasm/object-kernels/{Cargo.toml,Cargo.lock,rust-toolchain.toml,src/**}",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Mirrors source_fingerprint in scripts/build-object-kernels.sh. */
async function sourceFingerprint(): Promise<string> {
  const files: Record<string, string> = { [BUILD_SCRIPT_PATH]: buildScript };
  for (const [path, text] of Object.entries(kernelSources)) files[path.slice(1)] = text;
  const lines = await Promise.all(
    Object.keys(files)
      .sort()
      .map(async (path) => `${await sha256Hex(files[path] ?? "")}  ${path}\n`),
  );
  return sha256Hex(lines.join(""));
}

it("has the .wasm built from the current Rust source (run scripts/build-object-kernels.sh)", async () => {
  expect(await sourceFingerprint()).toBe(fingerprintFile.trim());
});
