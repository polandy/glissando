import { describe, expect, it } from "vitest";
import { decodeBase64, encodeBase64 } from "./base64";

describe("encodeBase64", () => {
  it.each([0, 1, 2, 3, 100_000])("encodes %i bytes as standard base64", (length) => {
    const bytes = Uint8Array.from({ length }, (_, index) => (index * 7) % 256);

    // One character at a time: slow, but plainly right.
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    expect(encodeBase64(bytes)).toBe(btoa(binary));
  });
});

describe("decodeBase64", () => {
  it("decodes standard base64 into bytes", () => {
    expect([...decodeBase64("AAEC/w==")]).toEqual([0, 1, 2, 255]);
  });
});
