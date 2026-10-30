import { describe, expect, it } from "vitest";
import { sha256 } from "./sha256.ts";

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function toHex(digest: Uint8Array): string {
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe("sha256", () => {
  // Known-answer tests (FIPS 180-4, plus the one-million-"a" vector it also defines).
  it("hashes the empty message", () => {
    expect(toHex(sha256(utf8("")))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it('hashes "abc"', () => {
    expect(toHex(sha256(utf8("abc")))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hashes the 448-bit multi-block message", () => {
    expect(toHex(sha256(utf8("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")))).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it('hashes one million "a" characters', () => {
    expect(toHex(sha256(utf8("a".repeat(1_000_000))))).toBe(
      "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0",
    );
  });

  it("hashes a message that crosses several 64-byte block boundaries", () => {
    const message = utf8("The quick brown fox jumps over the lazy dog. ".repeat(3));
    expect(message.length).toBeGreaterThan(64 * 2);
    expect(toHex(sha256(message))).toBe(
      "dc985401a68faff03051c78bbf32bb2fd27ba216b0dba19b050b936d534b8ba9",
    );
  });

  it("returns a 32-byte digest", () => {
    expect(sha256(utf8("abc")).length).toBe(32);
  });
});
