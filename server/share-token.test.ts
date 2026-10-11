import { describe, expect, it } from "vitest";
import { newShareToken, redactShareTokens, SHARE_TOKEN_BYTES } from "./share-token";

const bytes = (...values: number[]) => new Uint8Array(values);

describe("a new share token", () => {
  it.each([
    [
      "counting bytes",
      bytes(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15),
      "AAECAwQFBgcICQoLDA0ODw",
    ],
    [
      "bytes that base64 writes as + and /",
      bytes(...Array<number[]>(5).fill([0xfb, 0xff, 0xbf]).flat(), 0xfb),
      "-_-_-_-_-_-_-_-_-_-_-w",
    ],
  ])("is the random source's 16 bytes as base64url without padding: %s", (_, random, token) => {
    const requested: number[] = [];
    const made = newShareToken((count) => {
      requested.push(count);
      return random;
    });
    expect(requested).toEqual([SHARE_TOKEN_BYTES]);
    expect(made).toBe(token);
  });

  it("fails loud when the random source answers fewer bytes than asked", () => {
    expect(() => newShareToken(() => bytes(1, 2, 3))).toThrow("16");
  });
});

describe("redacting share tokens from a logged path", () => {
  it.each([
    ["/api/share/AQEBAQEBAQEBAQEBAQEBAQ", "/api/share/…"],
    ["/api/share/AQEBAQEBAQEBAQEBAQEBAQ/songs/0", "/api/share/…/songs/0"],
    ["/api/share/AQEBAQEBAQEBAQEBAQEBAQ/3/pictures/1", "/api/share/…/3/pictures/1"],
    ["/s/AQEBAQEBAQEBAQEBAQEBAQ", "/s/…"],
    ["/internal/share-picture/AQEBAQEBAQEBAQEBAQEBAQ/0", "/internal/share-picture/…/0"],
    ["/api/share/", "/api/share/…"],
    ["/api/library/slideshows/abc/share", "/api/library/slideshows/abc/share"],
    ["/api/shared/AQEBAQEBAQEBAQEBAQEBAQ", "/api/shared/AQEBAQEBAQEBAQEBAQEBAQ"],
  ])("logs %s as %s", (path, logged) => {
    expect(redactShareTokens(path)).toBe(logged);
  });
});
