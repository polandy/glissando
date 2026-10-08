import { describe, expect, it } from "vitest";
import { parsePrecache, PRECACHE_PLACEHOLDER } from "./precache";

describe("parsePrecache", () => {
  it("reads the version and files the build wrote in", () => {
    const written = JSON.stringify({ version: "abc", files: ["index.html", "assets/a.js"] });
    expect(parsePrecache(written)).toEqual({
      version: "abc",
      files: ["index.html", "assets/a.js"],
    });
  });

  it("fails loudly when the build did not replace the placeholder", () => {
    expect(() => parsePrecache(PRECACHE_PLACEHOLDER)).toThrow(/precache list/);
  });

  it.each([
    { what: "no version", written: { files: [] } },
    { what: "a file that is not a string", written: { version: "abc", files: [1] } },
    { what: "an unknown key", written: { version: "abc", files: [], extra: true } },
  ])("rejects a list with $what", ({ written }) => {
    expect(() => parsePrecache(JSON.stringify(written))).toThrow(/precache list/);
  });
});
