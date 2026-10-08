import { describe, expect, it } from "vitest";
import { PRECACHE_PLACEHOLDER } from "../src/sw/precache.ts";
import { precacheFor, writePrecache } from "./precache-list.ts";

const files = [
  { path: "index.html", content: "<html>" },
  { path: "assets/index-a1.js", content: "code" },
  { path: "icons/icon-192.png", content: new Uint8Array([1, 2, 3]) },
  { path: "sw.js", content: "worker" },
];

describe("precacheFor", () => {
  it("lists every file but the service worker itself, sorted", async () => {
    expect((await precacheFor(files)).files).toEqual([
      "assets/index-a1.js",
      "icons/icon-192.png",
      "index.html",
    ]);
  });

  it("gives the same build the same version", async () => {
    expect((await precacheFor([...files].reverse())).version).toBe(
      (await precacheFor(files)).version,
    );
  });

  it("gives a new version when a file's content changes, even under the same name", async () => {
    const changed = files.map((file) =>
      file.path === "index.html" ? { ...file, content: "<html lang>" } : file,
    );
    expect((await precacheFor(changed)).version).not.toBe((await precacheFor(files)).version);
  });

  it("gives a new version when a file is added", async () => {
    const added = [...files, { path: "assets/new.js", content: "more" }];
    expect((await precacheFor(added)).version).not.toBe((await precacheFor(files)).version);
  });

  it("ignores a change of the service worker's own code", async () => {
    const changed = files.map((file) =>
      file.path === "sw.js" ? { ...file, content: "other" } : file,
    );
    expect((await precacheFor(changed)).version).toBe((await precacheFor(files)).version);
  });
});

describe("writePrecache", () => {
  const precache = { version: "v1", files: ["index.html"] };

  it.each(['"', "'", "`"])(
    "replaces the placeholder quoted with %s by the list as a string literal",
    (quote) => {
      const code = `const p=parse(${quote}${PRECACHE_PLACEHOLDER}${quote});`;
      const written = writePrecache(code, precache);
      expect(written).toBe(`const p=parse(${JSON.stringify(JSON.stringify(precache))});`);
    },
  );

  it("fails the build when the placeholder is missing", () => {
    expect(() => writePrecache("const p=1;", precache)).toThrow(PRECACHE_PLACEHOLDER);
  });

  it("fails the build when the placeholder appears more than once", () => {
    const code = `"${PRECACHE_PLACEHOLDER}";"${PRECACHE_PLACEHOLDER}"`;
    expect(() => writePrecache(code, precache)).toThrow(/2 times/);
  });
});
