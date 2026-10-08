import { describe, expect, it } from "vitest";
import { crc32, crc32OfBlob } from "./crc32";

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

describe("crc32", () => {
  it.each([
    ["", 0x00000000],
    ["a", 0xe8b7be43],
    ["123456789", 0xcbf43926],
    ["The quick brown fox jumps over the lazy dog", 0x414fa339],
  ])("of %j is the standard ZIP checksum", (text, expected) => {
    expect(crc32(bytes(text))).toBe(expected);
  });

  it("continues over chunks to the checksum of the whole", () => {
    const first = crc32(bytes("12345"));
    expect(crc32(bytes("6789"), first)).toBe(0xcbf43926);
  });

  it("of a blob read in small chunks equals the checksum of its bytes", async () => {
    const blob = new Blob([bytes("The quick brown fox jumps over the lazy dog")]);
    expect(await crc32OfBlob(blob, 4)).toBe(0x414fa339);
  });
});
