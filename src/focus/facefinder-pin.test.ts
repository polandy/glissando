import { expect, it } from "vitest";
import cascadeDataUrl from "./facefinder.bin?url&inline";

/**
 * The cascade is https://github.com/nenadmarkus/pico/blob/7d550c78b2c31a4e1dfc5bcdfe9da013297b5cc8/rnt/cascades/facefinder
 * (MIT, Copyright (c) 2013 Nenad Markus), committed byte for byte as facefinder.bin.
 */
const FACEFINDER_SHA256 = "d8014993e7298c7b1865d1f8b855d6dbf4ec5c808bf879e2091ab6837abf90cd";

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

it("ships exactly the pinned facefinder cascade", async () => {
  const bytes = await (await fetch(cascadeDataUrl)).arrayBuffer();

  expect(await sha256Hex(bytes)).toBe(FACEFINDER_SHA256);
});
