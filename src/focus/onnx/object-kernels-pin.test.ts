import { expect, it } from "vitest";
import kernelsUrl from "./object-kernels.wasm?url&inline";

/** The kernels of ADR-0060 as scripts/build-object-kernels.sh builds them from wasm/object-kernels/. */
const OBJECT_KERNELS_SHA256 = "9ae30a388ef072c0bbbf461c426b20c48be6ff0cc31c9ee5b5666323538669e3";
const SIZE_BUDGET_BYTES = 150 * 1024;

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

it("ships exactly the pinned kernel module, within its size budget", async () => {
  const bytes = await (await fetch(kernelsUrl)).arrayBuffer();

  expect(await sha256Hex(bytes)).toBe(OBJECT_KERNELS_SHA256);
  expect(bytes.byteLength).toBeLessThanOrEqual(SIZE_BUDGET_BYTES);
});
