import { describe, expect, it } from "vitest";
import { randomId } from "./random-id";

describe("randomId", () => {
  it("is 128 random bits written as 32 hex digits", () => {
    const random = {
      getRandomValues: <T extends ArrayBufferView>(array: T): T => {
        new Uint8Array(array.buffer).forEach((_, index, bytes) => (bytes[index] = index * 17));
        return array;
      },
    };
    expect(randomId(random)).toBe("00112233445566778899aabbccddeeff");
  });
});
