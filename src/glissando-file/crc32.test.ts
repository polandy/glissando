import { describe, expect, it } from "vitest";
import { crc32, crc32OfBlob } from "./crc32";

const bytes = (text: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array(new TextEncoder().encode(text));

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

  it("of a million 'a' is the standard checksum", () => {
    expect(crc32(new Uint8Array(1_000_000).fill(0x61))).toBe(0xdc25bfbc);
  });

  it("matches a bitwise reference for every length and a multi-chunk split", () => {
    const reference = (data: Uint8Array): number => {
      let crc = 0xffffffff;
      for (const byte of data) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
      }
      return (crc ^ 0xffffffff) >>> 0;
    };
    const data = Uint8Array.from({ length: 200 }, (_, i) => (i * 37 + 11) & 0xff);
    for (let length = 0; length <= data.length; length++) {
      expect(crc32(data.subarray(0, length))).toBe(reference(data.subarray(0, length)));
    }
    let crc = 0;
    for (const [from, to] of [
      [0, 13],
      [13, 14],
      [14, 101],
      [101, 200],
    ] as const) {
      crc = crc32(data.subarray(from, to), crc);
    }
    expect(crc).toBe(reference(data));
  });

  it("of a blob read in small chunks equals the checksum of its bytes", async () => {
    const blob = new Blob([bytes("The quick brown fox jumps over the lazy dog")]);
    expect(await crc32OfBlob(blob, 4)).toBe(0x414fa339);
  });
});
