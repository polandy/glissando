import { expect, it } from "vitest";
import modelDataUrl from "./yolox-nano.bin?url&inline";

/**
 * The network is https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_nano.onnx
 * (Apache-2.0, Copyright (c) Megvii Inc.), committed byte for byte as yolox-nano.bin.
 */
const YOLOX_NANO_SHA256 = "c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d";

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

it("ships exactly the pinned YOLOX-nano network", async () => {
  const bytes = await (await fetch(modelDataUrl)).arrayBuffer();

  expect(await sha256Hex(bytes)).toBe(YOLOX_NANO_SHA256);
});
