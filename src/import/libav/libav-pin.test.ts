import { expect, it } from "vitest";
import loaderUrl from "./libav-6.10.9.0-glissando-audio.mjs?url&inline";
import factoryUrl from "./libav-6.10.9.0-glissando-audio.wasm.mjs?url&inline";
import wasmUrl from "./libav-6.10.9.0-glissando-audio.wasm.wasm?url&inline";

/**
 * The music decoder of ADR-0020, as scripts/build-audio-decoder.sh builds it from libav.js
 * v6.10.9.0 and FFmpeg 9.0; a new build changes these together with the script's pins.
 */
const PINNED: readonly [string, string, string][] = [
  [
    "libav-6.10.9.0-glissando-audio.mjs",
    loaderUrl,
    "74ea4aafc1b2147f42f8e0b1eef86586de938894d1926c0e7fe78d97fbb27554",
  ],
  [
    "libav-6.10.9.0-glissando-audio.wasm.mjs",
    factoryUrl,
    "dceb2202633a1ad5d8139577ffb9f122df16e731c5acb0ea1ab0368b967abd41",
  ],
  [
    "libav-6.10.9.0-glissando-audio.wasm.wasm",
    wasmUrl,
    "d57b426f46058fb314f779db6979863249878cab1de7fed515e14a4c2ed72d5c",
  ],
];

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

it.each(PINNED)("ships exactly the pinned %s", async (_file, url, sha256) => {
  const bytes = await (await fetch(url)).arrayBuffer();

  expect(await sha256Hex(bytes)).toBe(sha256);
});
